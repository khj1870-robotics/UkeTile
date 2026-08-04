// Ukulele chord library, standard GCEA tuning (high-g). Frets are listed in
// string order [G, C, E, A]; 0 = open string. Covers all 12 roots across a
// wide range of qualities (major/minor/7th/sus/dim/aug/...); a handful of the
// most common shapes are hand-picked familiar open-position fingerings, the
// rest are generated (see lib/chordTheory) and verified correct by pitch class.

import { ChordQuality, CHORD_QUALITIES, chordShape } from '@/lib/chordTheory';

export { OPEN_STRING_MIDI } from '@/lib/chordTheory';

export interface Chord {
  id: string;
  /** Root pitch class 0-11 (0 = C). */
  rootPc: number;
  quality: string;
  /** Display name, e.g. "Am" or "C♯sus4". */
  name: string;
  /** Fret pressed on each string, ordered [G, C, E, A]. */
  frets: [number, number, number, number];
}

export interface RootInfo {
  id: string;
  pc: number;
  label: string;
}

export const ROOTS: RootInfo[] = [
  { id: 'C', pc: 0, label: 'C' },
  { id: 'C#', pc: 1, label: 'C♯' },
  { id: 'D', pc: 2, label: 'D' },
  { id: 'D#', pc: 3, label: 'D♯' },
  { id: 'E', pc: 4, label: 'E' },
  { id: 'F', pc: 5, label: 'F' },
  { id: 'F#', pc: 6, label: 'F♯' },
  { id: 'G', pc: 7, label: 'G' },
  { id: 'G#', pc: 8, label: 'G♯' },
  { id: 'A', pc: 9, label: 'A' },
  { id: 'A#', pc: 10, label: 'A♯' },
  { id: 'B', pc: 11, label: 'B' },
];

/** Familiar open-position shapes, preferred over the generic search below. */
const CURATED_SHAPES: Record<string, [number, number, number, number]> = {
  'C-maj': [0, 0, 0, 3],
  'C-min': [0, 3, 3, 3],
  'C-7': [0, 0, 0, 1],
  'D-maj': [2, 2, 2, 0],
  'D-min': [2, 2, 1, 0],
  'D-7': [2, 2, 2, 3],
  'E-maj': [4, 4, 4, 2],
  'E-min': [0, 4, 3, 2],
  'E-7': [1, 2, 0, 2],
  'F-maj': [2, 0, 1, 0],
  'F-min': [1, 0, 1, 3],
  'F-7': [2, 3, 1, 3],
  'G-maj': [0, 2, 3, 2],
  'G-min': [0, 2, 3, 1],
  'G-7': [0, 2, 1, 2],
  'A-maj': [2, 1, 0, 0],
  'A-min': [2, 0, 0, 0],
  'A-7': [0, 1, 0, 0],
  'A#-maj': [3, 2, 1, 1],
  'B-maj': [4, 3, 2, 2],
  'B-min': [4, 2, 2, 2],
  'B-7': [2, 3, 2, 2],
};

function buildChord(root: RootInfo, quality: ChordQuality): Chord {
  const key = `${root.id}-${quality.id}`;
  const frets = CURATED_SHAPES[key] ?? chordShape(root.pc, quality.intervals);
  return {
    id: key,
    rootPc: root.pc,
    quality: quality.id,
    name: `${root.label}${quality.suffix}`,
    frets,
  };
}

export const CHORDS: Chord[] = ROOTS.flatMap((root) =>
  CHORD_QUALITIES.map((quality) => buildChord(root, quality))
);

const byId = new Map(CHORDS.map((chord) => [chord.id, chord]));

export function getChord(id: string): Chord | undefined {
  return byId.get(id);
}

/** All chord variants (major, minor, 7th, sus4, ...) for a given root. */
export function chordsForRoot(rootId: string): Chord[] {
  const root = ROOTS.find((r) => r.id === rootId);
  if (!root) return [];
  return CHORDS.filter((chord) => chord.rootPc === root.pc);
}
