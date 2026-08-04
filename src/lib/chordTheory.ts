// Music-theory helpers for generating ukulele chord fingerings. Pitch classes
// are 0-11 with C=0, following standard MIDI-mod-12 convention.

/** Ukulele standard (high-G) tuning: open-string MIDI notes [G4, C4, E4, A4]. */
export const OPEN_STRING_MIDI: [number, number, number, number] = [67, 60, 64, 69];

export interface ChordQuality {
  id: string;
  /** Suffix appended to the root name, e.g. "m7", "sus4" ("" for plain major). */
  suffix: string;
  /** Semitone intervals from the root that make up the chord. */
  intervals: readonly number[];
}

export const CHORD_QUALITIES: ChordQuality[] = [
  { id: 'maj', suffix: '', intervals: [0, 4, 7] },
  { id: 'min', suffix: 'm', intervals: [0, 3, 7] },
  { id: '7', suffix: '7', intervals: [0, 4, 7, 10] },
  { id: 'm7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'maj7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { id: '6', suffix: '6', intervals: [0, 4, 7, 9] },
  { id: 'm6', suffix: 'm6', intervals: [0, 3, 7, 9] },
  { id: 'sus2', suffix: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', suffix: 'sus4', intervals: [0, 5, 7] },
  { id: '7sus4', suffix: '7sus4', intervals: [0, 5, 7, 10] },
  { id: 'add9', suffix: 'add9', intervals: [0, 2, 4, 7] },
  { id: '9', suffix: '9', intervals: [0, 2, 4, 7, 10] },
  { id: 'dim', suffix: 'dim', intervals: [0, 3, 6] },
  { id: 'dim7', suffix: 'dim7', intervals: [0, 3, 6, 9] },
  { id: 'aug', suffix: 'aug', intervals: [0, 4, 8] },
];

const MAX_SEARCH_FRET = 11;

/**
 * A valid fret on each string that sounds a pitch class belonging to the
 * chord (root pitch-class + intervals): the lowest fret (0-11) per string
 * that works. Always succeeds, since every pitch class occurs somewhere
 * within an octave of any open string.
 */
export function chordShape(rootPc: number, intervals: readonly number[]): [number, number, number, number] {
  const allowed = new Set(intervals.map((i) => (rootPc + i) % 12));
  return OPEN_STRING_MIDI.map((openMidi) => {
    for (let fret = 0; fret <= MAX_SEARCH_FRET; fret++) {
      if (allowed.has((openMidi + fret) % 12)) return fret;
    }
    return 0; // unreachable: allowed is non-empty and every pitch class appears within an octave
  }) as [number, number, number, number];
}

/** Pitch classes actually sounded by a fret shape, one per string. */
export function shapePitchClasses(frets: readonly [number, number, number, number]): number[] {
  return frets.map((fret, string) => (OPEN_STRING_MIDI[string] + fret) % 12);
}
