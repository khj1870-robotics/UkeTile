import { Chord, OPEN_STRING_MIDI } from '@/data/chords';

/**
 * MIDI notes sounded by strumming a chord, in string order [G, C, E, A]
 * (low-to-high strum order on a high-g ukulele).
 */
export function chordMidiNotes(chord: Chord): [number, number, number, number] {
  return chord.frets.map((fret, string) => OPEN_STRING_MIDI[string] + fret) as [
    number,
    number,
    number,
    number,
  ];
}
