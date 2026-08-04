// Ukulele chord library, standard GCEA tuning (high-g).
// Frets are listed in string order [G, C, E, A]; 0 = open string.

export interface Chord {
  id: string;
  /** Display name, e.g. "Am" or "G7". */
  name: string;
  /** Fret pressed on each string, ordered [G, C, E, A]. */
  frets: [number, number, number, number];
}

/** Open-string MIDI notes for GCEA tuning: G4, C4, E4, A4. */
export const OPEN_STRING_MIDI: [number, number, number, number] = [67, 60, 64, 69];

export const CHORDS: Chord[] = [
  { id: 'C', name: 'C', frets: [0, 0, 0, 3] },
  { id: 'Cm', name: 'Cm', frets: [0, 3, 3, 3] },
  { id: 'C7', name: 'C7', frets: [0, 0, 0, 1] },
  { id: 'D', name: 'D', frets: [2, 2, 2, 0] },
  { id: 'Dm', name: 'Dm', frets: [2, 2, 1, 0] },
  { id: 'D7', name: 'D7', frets: [2, 2, 2, 3] },
  { id: 'E', name: 'E', frets: [4, 4, 4, 2] },
  { id: 'Em', name: 'Em', frets: [0, 4, 3, 2] },
  { id: 'E7', name: 'E7', frets: [1, 2, 0, 2] },
  { id: 'F', name: 'F', frets: [2, 0, 1, 0] },
  { id: 'Fm', name: 'Fm', frets: [1, 0, 1, 3] },
  { id: 'F7', name: 'F7', frets: [2, 3, 1, 3] },
  { id: 'G', name: 'G', frets: [0, 2, 3, 2] },
  { id: 'Gm', name: 'Gm', frets: [0, 2, 3, 1] },
  { id: 'G7', name: 'G7', frets: [0, 2, 1, 2] },
  { id: 'A', name: 'A', frets: [2, 1, 0, 0] },
  { id: 'Am', name: 'Am', frets: [2, 0, 0, 0] },
  { id: 'A7', name: 'A7', frets: [0, 1, 0, 0] },
  { id: 'Bb', name: 'B♭', frets: [3, 2, 1, 1] },
  { id: 'B', name: 'B', frets: [4, 3, 2, 2] },
  { id: 'Bm', name: 'Bm', frets: [4, 2, 2, 2] },
  { id: 'B7', name: 'B7', frets: [2, 3, 2, 2] },
];

const byId = new Map(CHORDS.map((chord) => [chord.id, chord]));

export function getChord(id: string): Chord | undefined {
  return byId.get(id);
}
