import { CHORD_QUALITIES, chordShape, shapePitchClasses } from '@/lib/chordTheory';
import { CHORDS, ROOTS } from '@/data/chords';

describe('chordShape', () => {
  it('finds a fret within a single octave for every quality, on every root', () => {
    for (const root of ROOTS) {
      for (const quality of CHORD_QUALITIES) {
        const frets = chordShape(root.pc, quality.intervals);
        for (const fret of frets) {
          expect(fret).toBeGreaterThanOrEqual(0);
          expect(fret).toBeLessThanOrEqual(11);
        }
      }
    }
  });

  it('only sounds pitch classes belonging to the chord', () => {
    for (const root of ROOTS) {
      for (const quality of CHORD_QUALITIES) {
        const frets = chordShape(root.pc, quality.intervals);
        const allowed = new Set(quality.intervals.map((i) => (root.pc + i) % 12));
        for (const pc of shapePitchClasses(frets)) {
          expect(allowed.has(pc)).toBe(true);
        }
      }
    }
  });
});

describe('CHORDS data', () => {
  it('covers all 12 roots and every quality', () => {
    expect(CHORDS).toHaveLength(ROOTS.length * CHORD_QUALITIES.length);
  });

  it('has a unique id per chord', () => {
    const ids = CHORDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every chord — curated or generated — only sounds its own chord tones', () => {
    const qualityById = new Map(CHORD_QUALITIES.map((q) => [q.id, q]));
    for (const chord of CHORDS) {
      const quality = qualityById.get(chord.quality)!;
      const allowed = new Set(quality.intervals.map((i) => (chord.rootPc + i) % 12));
      for (const pc of shapePitchClasses(chord.frets)) {
        expect(allowed.has(pc)).toBe(true);
      }
    }
  });
});
