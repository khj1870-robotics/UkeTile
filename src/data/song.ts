// Song data model (§4/§5). A song is built from measures, each measure a
// fixed 8-slot timing grid (half-beat resolution in 4/4), and chord blocks
// that snap to that grid — never free pixel coordinates (§39).

import { DEFAULT_STROKE_ID, StrokeId, StrokePattern } from '@/data/strokePatterns';

/** One measure of 4/4 = 8 half-beat slots (§5). Fixed for MVP; kept as a named constant everywhere a "8" would otherwise appear. */
export const SLOTS_PER_MEASURE = 8;

/** New chord blocks start at 1 beat = 2 slots (§6). */
export const DEFAULT_BLOCK_LENGTH_SLOTS = 2;

export const DEFAULT_MEASURE_COUNT = 4;

export const DEFAULT_BPM = 80;

export interface ChordBlock {
  id: string;
  chordId: string;
  /** 0-7: which half-beat slot the block starts on. */
  startSlot: number;
  /** 1-8 half-beats long. */
  lengthSlots: number;
  /** Per-block stroke override; undefined means "use the song's default stroke". */
  strokeId?: StrokeId;
  /** Only meaningful when strokeId === 'custom'. */
  customPattern?: StrokePattern;
}

export interface Measure {
  id: string;
  blocks: ChordBlock[];
}

export interface TimeSignature {
  numerator: 4;
  denominator: 4;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  timeSig: TimeSignature;
  defaultStrokeId: StrokeId;
  metronomeOn: boolean;
  chordSoundOn: boolean;
  measures: Measure[];
  createdAt: number;
  updatedAt: number;
}

export function emptySong(title: string, bpm: number, newId: () => string): Song {
  const now = Date.now();
  return {
    id: newId(),
    title,
    bpm,
    timeSig: { numerator: 4, denominator: 4 },
    defaultStrokeId: DEFAULT_STROKE_ID,
    metronomeOn: true,
    chordSoundOn: true,
    measures: Array.from({ length: DEFAULT_MEASURE_COUNT }, () => ({ id: newId(), blocks: [] })),
    createdAt: now,
    updatedAt: now,
  };
}
