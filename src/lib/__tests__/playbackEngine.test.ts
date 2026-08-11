import { Song, SLOTS_PER_MEASURE } from '@/data/song';
import {
  blockAtTime,
  buildTimeline,
  collectDue,
  findIndexAtOrAfter,
  PlaybackScheduler,
  slotDurationSec,
} from '@/lib/playbackEngine';

function songWithFullMeasureBlocks(bpm: number): Song {
  const now = Date.now();
  return {
    id: 'song-1',
    title: 'Test',
    bpm,
    timeSig: { numerator: 4, denominator: 4 },
    defaultStrokeId: 'basic',
    metronomeOn: true,
    chordSoundOn: true,
    createdAt: now,
    updatedAt: now,
    measures: [
      { id: 'm0', blocks: [{ id: 'b0', chordId: 'C-maj', startSlot: 0, lengthSlots: SLOTS_PER_MEASURE }] },
      { id: 'm1', blocks: [{ id: 'b1', chordId: 'A-min', startSlot: 0, lengthSlots: SLOTS_PER_MEASURE }] },
    ],
  };
}

describe('slotDurationSec', () => {
  it('is half a beat: 30/bpm seconds', () => {
    expect(slotDurationSec(60)).toBe(0.5);
    expect(slotDurationSec(120)).toBe(0.25);
  });
});

describe('buildTimeline', () => {
  it('derives every timestamp from bpm × slot position, not pixels (§22)', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(60));

    expect(timeline.durationSec).toBe(8); // 2 measures * 8 slots * 0.5s
    expect(timeline.blocks.map((b) => [b.startSec, b.endSec])).toEqual([
      [0, 4],
      [4, 8],
    ]);
    expect(timeline.chordEvents.map((e) => e.timeSec)).toEqual([0, 4]);
  });

  it('a multi-beat chord produces multiple strum events, not one (§20)', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(60));
    // 'basic' stroke hits D on slots 0,2,4,6 of each measure.
    const firstBlockStrums = timeline.strumEvents.filter((e) => e.blockId === 'b0');
    expect(firstBlockStrums).toHaveLength(4);
    expect(firstBlockStrums.map((e) => e.timeSec)).toEqual([0, 1, 2, 3]);
    expect(firstBlockStrums.every((e) => e.direction === 'D')).toBe(true);
  });

  it('metronome accents the downbeat of every measure', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(60));
    const accented = timeline.metronomeEvents.filter((e) => e.accent).map((e) => e.timeSec);
    expect(accented).toEqual([0, 4]);
    expect(timeline.metronomeEvents).toHaveLength(8); // 4 beats/measure * 2 measures
  });

  it('a half-beat-long block only fires the pattern hits that fall inside its own range', () => {
    const now = Date.now();
    const song: Song = {
      id: 's',
      title: 't',
      bpm: 60,
      timeSig: { numerator: 4, denominator: 4 },
      defaultStrokeId: 'pop', // D,null,D,U,U,null,D,U
      metronomeOn: true,
      chordSoundOn: true,
      createdAt: now,
      updatedAt: now,
      measures: [{ id: 'm0', blocks: [{ id: 'b0', chordId: 'C-maj', startSlot: 2, lengthSlots: 1 }] }],
    };
    const timeline = buildTimeline(song);
    expect(timeline.strumEvents).toHaveLength(1);
    expect(timeline.strumEvents[0]).toMatchObject({ direction: 'D', timeSec: 1 }); // slot 2 * 0.5s
  });
});

describe('collectDue / findIndexAtOrAfter / blockAtTime (pure scheduling helpers)', () => {
  const events = [{ timeSec: 0 }, { timeSec: 1 }, { timeSec: 2 }, { timeSec: 3 }];

  it('collectDue returns events up to and including the cutoff, advancing the index', () => {
    const { due, nextIdx } = collectDue(events, 0, 1.5);
    expect(due).toEqual([{ timeSec: 0 }, { timeSec: 1 }]);
    expect(nextIdx).toBe(2);
  });

  it('collectDue resumes from a given index without re-firing earlier events', () => {
    const { due, nextIdx } = collectDue(events, 2, 3);
    expect(due).toEqual([{ timeSec: 2 }, { timeSec: 3 }]);
    expect(nextIdx).toBe(4);
  });

  it('findIndexAtOrAfter finds the right resume point for a seek', () => {
    expect(findIndexAtOrAfter(events, 2)).toBe(2);
    expect(findIndexAtOrAfter(events, 2.5)).toBe(3);
    expect(findIndexAtOrAfter(events, 10)).toBe(4);
  });

  it('blockAtTime finds the block active at a given time, start-inclusive end-exclusive', () => {
    const blocks = buildTimeline(songWithFullMeasureBlocks(60)).blocks;
    expect(blockAtTime(blocks, 0)?.blockId).toBe('b0');
    expect(blockAtTime(blocks, 3.99)?.blockId).toBe('b0');
    expect(blockAtTime(blocks, 4)?.blockId).toBe('b1');
    expect(blockAtTime(blocks, 8)).toBeNull();
  });
});

describe('PlaybackScheduler gating (§23 — metronome and chord sound toggle independently)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('never fires strums when chord sound is off, but still fires metronome clicks', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(120)); // slot = 0.25s, fast for a short test
    const onStrum = jest.fn();
    const onMetronome = jest.fn();
    const scheduler = new PlaybackScheduler(timeline, {
      isMetronomeOn: () => true,
      isChordSoundOn: () => false,
      onStrum,
      onMetronome,
      onBlockChange: () => {},
      onProgress: () => {},
      onFinish: () => {},
      loop: false,
    });

    scheduler.play(0, false);
    jest.advanceTimersByTime(1200);

    expect(onStrum).not.toHaveBeenCalled();
    expect(onMetronome).toHaveBeenCalled();
    scheduler.stop();
  });

  it('never fires metronome clicks when metronome is off, but still fires strums', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(120));
    const onStrum = jest.fn();
    const onMetronome = jest.fn();
    const scheduler = new PlaybackScheduler(timeline, {
      isMetronomeOn: () => false,
      isChordSoundOn: () => true,
      onStrum,
      onMetronome,
      onBlockChange: () => {},
      onProgress: () => {},
      onFinish: () => {},
      loop: false,
    });

    scheduler.play(0, false);
    jest.advanceTimersByTime(1200);

    expect(onMetronome).not.toHaveBeenCalled();
    expect(onStrum).toHaveBeenCalled();
    scheduler.stop();
  });

  it('screen still advances (onBlockChange fires) even with both sounds off — practicing on a real instrument', () => {
    const timeline = buildTimeline(songWithFullMeasureBlocks(120));
    const onBlockChange = jest.fn();
    const scheduler = new PlaybackScheduler(timeline, {
      isMetronomeOn: () => false,
      isChordSoundOn: () => false,
      onStrum: () => {},
      onMetronome: () => {},
      onBlockChange,
      onProgress: () => {},
      onFinish: () => {},
      loop: false,
    });

    scheduler.play(0, false);
    jest.advanceTimersByTime(2100); // past the 2s boundary into the second block

    expect(onBlockChange).toHaveBeenCalledWith(expect.objectContaining({ blockId: 'b1' }));
    scheduler.stop();
  });
});
