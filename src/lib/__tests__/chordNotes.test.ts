import { getChord } from '@/data/chords';
import { chordMidiNotes } from '@/lib/chordNotes';

describe('chordMidiNotes', () => {
  it('computes MIDI notes for an all-open chord (C)', () => {
    const chord = getChord('C')!;
    // Open strings: G4=67, C4=60, E4=64, A4=69; C shape frets [0,0,0,3]
    expect(chordMidiNotes(chord)).toEqual([67, 60, 64, 72]);
  });

  it('adds each fret to its open-string note, in string order', () => {
    const chord = getChord('G')!;
    // frets [0, 2, 3, 2] over open [67, 60, 64, 69]
    expect(chordMidiNotes(chord)).toEqual([67, 62, 67, 71]);
  });

  it('handles a fully-fretted chord (E)', () => {
    const chord = getChord('E')!;
    // frets [4, 4, 4, 2]
    expect(chordMidiNotes(chord)).toEqual([71, 64, 68, 71]);
  });
});
