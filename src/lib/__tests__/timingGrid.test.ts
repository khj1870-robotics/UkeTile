import { ChordBlock, SLOTS_PER_MEASURE } from '@/data/song';
import {
  canPlace,
  clampResizeLength,
  firstFreeRange,
  nearestValidStart,
  slotToX,
  xToSlot,
} from '@/lib/timingGrid';

function block(id: string, startSlot: number, lengthSlots: number): ChordBlock {
  return { id, chordId: 'C-maj', startSlot, lengthSlots };
}

describe('canPlace', () => {
  it('accepts a range that fits within the measure and does not overlap', () => {
    expect(canPlace([], { start: 0, length: 2 })).toBe(true);
    expect(canPlace([block('a', 0, 2)], { start: 2, length: 2 })).toBe(true);
  });

  it('rejects a range that overlaps an existing block', () => {
    expect(canPlace([block('a', 2, 2)], { start: 1, length: 2 })).toBe(false);
    expect(canPlace([block('a', 2, 2)], { start: 3, length: 2 })).toBe(false);
  });

  it('rejects a range outside the measure bounds', () => {
    expect(canPlace([], { start: -1, length: 2 })).toBe(false);
    expect(canPlace([], { start: 7, length: 2 })).toBe(false);
    expect(canPlace([], { start: 0, length: SLOTS_PER_MEASURE + 1 })).toBe(false);
  });

  it('allows a block to "overlap" itself via excludeId (used when resizing/moving in place)', () => {
    expect(canPlace([block('a', 2, 2)], { start: 2, length: 3 }, 'a')).toBe(true);
  });

  it('never auto-divides — a full 8-slot measure only fits exactly one full-length block', () => {
    expect(canPlace([], { start: 0, length: SLOTS_PER_MEASURE })).toBe(true);
    expect(canPlace([block('a', 0, SLOTS_PER_MEASURE)], { start: 0, length: 1 })).toBe(false);
  });
});

describe('firstFreeRange', () => {
  it('returns the start of the measure when empty', () => {
    expect(firstFreeRange([], 2)).toEqual({ start: 0, length: 2 });
  });

  it('skips past occupied slots', () => {
    expect(firstFreeRange([block('a', 0, 2)], 2)).toEqual({ start: 2, length: 2 });
  });

  it('returns null when there is no room left', () => {
    expect(firstFreeRange([block('a', 0, SLOTS_PER_MEASURE)], 1)).toBeNull();
  });
});

describe('clampResizeLength', () => {
  it('clamps to the measure boundary', () => {
    expect(clampResizeLength([block('a', 6, 2)], 'a', 10)).toBe(2);
  });

  it('clamps to the next block instead of overlapping it', () => {
    const blocks = [block('a', 0, 2), block('b', 4, 2)];
    expect(clampResizeLength(blocks, 'a', 8)).toBe(4);
  });

  it('allows shrinking down to 1 slot', () => {
    expect(clampResizeLength([block('a', 0, 4)], 'a', 1)).toBe(1);
  });
});

describe('nearestValidStart', () => {
  it('keeps the target start when it already fits', () => {
    expect(nearestValidStart([], 2, 3)).toBe(3);
  });

  it('snaps to the nearest free start when the target overlaps another block', () => {
    const blocks = [block('a', 2, 2)];
    const start = nearestValidStart(blocks, 2, 2, undefined);
    expect(start).not.toBeNull();
    expect(canPlace(blocks, { start: start!, length: 2 })).toBe(true);
  });

  it('lets a block move back onto its own slots via excludeId', () => {
    const blocks = [block('a', 2, 2)];
    expect(nearestValidStart(blocks, 2, 2, 'a')).toBe(2);
  });

  it('returns null when the measure has no room at all for the requested length', () => {
    const blocks = [block('a', 0, SLOTS_PER_MEASURE)];
    expect(nearestValidStart(blocks, 2, 0)).toBeNull();
  });
});

describe('slotToX / xToSlot', () => {
  it('round-trips a slot through pixel space', () => {
    const measureWidth = 320;
    for (let slot = 0; slot <= SLOTS_PER_MEASURE; slot++) {
      expect(xToSlot(slotToX(slot, measureWidth), measureWidth)).toBe(slot);
    }
  });
});
