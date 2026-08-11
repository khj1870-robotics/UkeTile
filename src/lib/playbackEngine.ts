// Turns a Song into a flat, precomputed timeline of events, then schedules
// those events against the wall clock. Every timestamp comes from musical
// data (BPM × slot position) — never from pixel/layout measurements (§22).

import { Song, SLOTS_PER_MEASURE } from '@/data/song';
import { resolvePattern, StrokePattern } from '@/data/strokePatterns';

export interface StrumEvent {
  timeSec: number;
  chordId: string;
  direction: 'D' | 'U';
  blockId: string;
}

export interface ChordChangeEvent {
  timeSec: number;
  blockId: string;
  chordId: string;
  measureIndex: number;
  blockOrder: number;
}

export interface MetronomeEvent {
  timeSec: number;
  accent: boolean;
}

export interface TimelineBlock {
  blockId: string;
  chordId: string;
  measureIndex: number;
  order: number;
  startSec: number;
  endSec: number;
  pattern: StrokePattern;
}

export interface PlaybackTimeline {
  durationSec: number;
  strumEvents: StrumEvent[];
  chordEvents: ChordChangeEvent[];
  metronomeEvents: MetronomeEvent[];
  blocks: TimelineBlock[];
}

/** Seconds per timing-grid slot (a slot is half a beat). */
export function slotDurationSec(bpm: number): number {
  return 30 / bpm;
}

export function buildTimeline(song: Song): PlaybackTimeline {
  const slotSec = slotDurationSec(song.bpm);
  const strumEvents: StrumEvent[] = [];
  const chordEvents: ChordChangeEvent[] = [];
  const metronomeEvents: MetronomeEvent[] = [];
  const blocks: TimelineBlock[] = [];
  let order = 0;

  song.measures.forEach((measure, measureIndex) => {
    for (let beat = 0; beat < SLOTS_PER_MEASURE; beat += 2) {
      metronomeEvents.push({
        timeSec: (measureIndex * SLOTS_PER_MEASURE + beat) * slotSec,
        accent: beat === 0,
      });
    }

    const sortedBlocks = [...measure.blocks].sort((a, b) => a.startSlot - b.startSlot);
    for (const block of sortedBlocks) {
      const absStart = measureIndex * SLOTS_PER_MEASURE + block.startSlot;
      const absEnd = absStart + block.lengthSlots;
      const startSec = absStart * slotSec;
      const endSec = absEnd * slotSec;

      const pattern = resolvePattern(block.strokeId ?? song.defaultStrokeId, block.customPattern);

      chordEvents.push({
        timeSec: startSec,
        blockId: block.id,
        chordId: block.chordId,
        measureIndex,
        blockOrder: order,
      });
      blocks.push({
        blockId: block.id,
        chordId: block.chordId,
        measureIndex,
        order,
        startSec,
        endSec,
        pattern,
      });
      order++;

      for (let slot = block.startSlot; slot < block.startSlot + block.lengthSlots; slot++) {
        const hit = pattern[slot % SLOTS_PER_MEASURE];
        if (!hit) continue;
        strumEvents.push({
          timeSec: (measureIndex * SLOTS_PER_MEASURE + slot) * slotSec,
          chordId: block.chordId,
          direction: hit,
          blockId: block.id,
        });
      }
    }
  });

  return {
    durationSec: song.measures.length * SLOTS_PER_MEASURE * slotSec,
    strumEvents,
    chordEvents,
    metronomeEvents,
    blocks,
  };
}

/** Events in `events` (assumed sorted by timeSec) with timeSec <= uptoSec, starting the scan at fromIdx. Pure — no timers. */
export function collectDue<E extends { timeSec: number }>(
  events: readonly E[],
  fromIdx: number,
  uptoSec: number
): { due: E[]; nextIdx: number } {
  let idx = fromIdx;
  const due: E[] = [];
  while (idx < events.length && events[idx].timeSec <= uptoSec) {
    due.push(events[idx]);
    idx++;
  }
  return { due, nextIdx: idx };
}

/** Index of the first event at or after `sec` (events.length if none). */
export function findIndexAtOrAfter<E extends { timeSec: number }>(events: readonly E[], sec: number): number {
  const idx = events.findIndex((e) => e.timeSec >= sec);
  return idx === -1 ? events.length : idx;
}

/** The block active at `sec` (start inclusive, end exclusive), or null between/after blocks. */
export function blockAtTime(blocks: readonly TimelineBlock[], sec: number): TimelineBlock | null {
  return blocks.find((b) => sec >= b.startSec && sec < b.endSec) ?? null;
}

const TICK_MS = 40;
const COUNT_IN_BEATS = 4;

export interface SchedulerCallbacks {
  isMetronomeOn: () => boolean;
  isChordSoundOn: () => boolean;
  onStrum: (event: StrumEvent) => void;
  onMetronome: (event: MetronomeEvent) => void;
  /** Fires whenever the active block changes (including to null past the end). */
  onBlockChange: (block: TimelineBlock | null) => void;
  onProgress: (elapsedSec: number) => void;
  onFinish: () => void;
  /** Called once per count-in click, beatsRemaining counts down 4..1. */
  onCountIn?: (beatsRemaining: number) => void;
  onCountInDone?: () => void;
  loop: boolean;
}

/**
 * Fires timeline events against the wall clock. A single `setInterval`
 * lookahead loop compares elapsed real time to each event's precomputed
 * timestamp — the standard drift-corrected scheduling pattern, since nothing
 * here can rely on sample-accurate audio callbacks in this runtime.
 */
export class PlaybackScheduler {
  private timeline: PlaybackTimeline;
  private cb: SchedulerCallbacks;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private countInHandle: ReturnType<typeof setTimeout> | null = null;
  private startedAtMs = 0;
  private elapsedAtStart = 0;
  private playing = false;
  private strumIdx = 0;
  private metroIdx = 0;
  private blockIdx = 0;
  private currentBlock: TimelineBlock | null = null;

  constructor(timeline: PlaybackTimeline, callbacks: SchedulerCallbacks) {
    this.timeline = timeline;
    this.cb = callbacks;
  }

  private elapsedSec(): number {
    if (!this.playing) return this.elapsedAtStart;
    return this.elapsedAtStart + (Date.now() - this.startedAtMs) / 1000;
  }

  private syncIndicesTo(sec: number) {
    this.strumIdx = findIndexAtOrAfter(this.timeline.strumEvents, sec);
    this.metroIdx = findIndexAtOrAfter(this.timeline.metronomeEvents, sec);
    this.blockIdx = findIndexAtOrAfter(this.timeline.chordEvents, sec);
    this.currentBlock = blockAtTime(this.timeline.blocks, sec);
    this.cb.onBlockChange(this.currentBlock);
  }

  private runCountIn(onDone: () => void) {
    let remaining = COUNT_IN_BEATS;
    const beatMs = ((): number => {
      // Derive beat duration from the first two metronome events if present, else fall back to 500ms (120bpm-ish).
      const [a, b] = this.timeline.metronomeEvents;
      if (a && b) return (b.timeSec - a.timeSec) * 1000;
      return 500;
    })();
    this.cb.onCountIn?.(remaining);
    if (this.cb.isMetronomeOn()) this.cb.onMetronome({ timeSec: 0, accent: true });
    const tick = () => {
      remaining--;
      if (remaining <= 0) {
        this.countInHandle = null;
        this.cb.onCountInDone?.();
        onDone();
        return;
      }
      this.cb.onCountIn?.(remaining);
      if (this.cb.isMetronomeOn()) this.cb.onMetronome({ timeSec: 0, accent: false });
      this.countInHandle = setTimeout(tick, beatMs);
    };
    this.countInHandle = setTimeout(tick, beatMs);
  }

  /** Starts playback from `fromSec` (default: wherever it was paused). Set `withCountIn` to run the 4-beat count-in first. */
  play(fromSec = this.elapsedAtStart, withCountIn = false) {
    this.stopTimers();
    this.elapsedAtStart = fromSec;
    this.syncIndicesTo(fromSec);
    const begin = () => {
      this.startedAtMs = Date.now();
      this.playing = true;
      this.tick();
      this.intervalHandle = setInterval(() => this.tick(), TICK_MS);
    };
    if (withCountIn) {
      this.runCountIn(begin);
    } else {
      begin();
    }
  }

  pause() {
    if (!this.playing && !this.countInHandle) return;
    this.elapsedAtStart = this.elapsedSec();
    this.playing = false;
    this.stopTimers();
  }

  private stopTimers() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.countInHandle) {
      clearTimeout(this.countInHandle);
      this.countInHandle = null;
    }
  }

  stop() {
    this.stopTimers();
    this.playing = false;
    this.elapsedAtStart = 0;
    this.syncIndicesTo(0);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setLoop(loop: boolean) {
    this.cb.loop = loop;
  }

  seekToBlockOrder(order: number) {
    const block = this.timeline.blocks.find((b) => b.order === order);
    const target = block ? block.startSec : this.playing ? this.timeline.durationSec : 0;
    const wasPlaying = this.playing;
    this.stopTimers();
    this.playing = false;
    this.elapsedAtStart = target;
    this.syncIndicesTo(target);
    if (wasPlaying) this.play(target);
  }

  next() {
    const nextOrder = (this.currentBlock?.order ?? -1) + 1;
    if (nextOrder < this.timeline.blocks.length) this.seekToBlockOrder(nextOrder);
  }

  previous() {
    const prevOrder = (this.currentBlock?.order ?? 0) - 1;
    this.seekToBlockOrder(Math.max(0, prevOrder));
  }

  private tick() {
    const t = this.elapsedSec();

    const strumDue = collectDue(this.timeline.strumEvents, this.strumIdx, t);
    this.strumIdx = strumDue.nextIdx;
    if (this.cb.isChordSoundOn()) strumDue.due.forEach((e) => this.cb.onStrum(e));

    const metroDue = collectDue(this.timeline.metronomeEvents, this.metroIdx, t);
    this.metroIdx = metroDue.nextIdx;
    if (this.cb.isMetronomeOn()) metroDue.due.forEach((e) => this.cb.onMetronome(e));

    const chordDue = collectDue(this.timeline.chordEvents, this.blockIdx, t);
    this.blockIdx = chordDue.nextIdx;
    if (chordDue.due.length > 0) {
      const last = chordDue.due[chordDue.due.length - 1];
      this.currentBlock = this.timeline.blocks.find((b) => b.blockId === last.blockId) ?? null;
      this.cb.onBlockChange(this.currentBlock);
    }

    this.cb.onProgress(t);

    if (t >= this.timeline.durationSec) {
      if (this.cb.loop) {
        this.play(0);
      } else {
        this.pause();
        this.currentBlock = null;
        this.cb.onBlockChange(null);
        this.cb.onFinish();
      }
    }
  }
}
