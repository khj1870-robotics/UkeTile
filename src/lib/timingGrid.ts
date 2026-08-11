// Pure grid math for chord-block placement inside a measure's fixed 8-slot
// timing grid (§5-§8). Every block snaps to integer slot boundaries; nothing
// here deals in free pixel coordinates or auto-divides a measure by however
// many chords happen to be in it (§39).

import { ChordBlock, SLOTS_PER_MEASURE } from '@/data/song';

export interface SlotRange {
  start: number;
  length: number;
}

export function rangeEnd(range: SlotRange): number {
  return range.start + range.length;
}

function overlaps(a: SlotRange, b: SlotRange): boolean {
  return a.start < rangeEnd(b) && b.start < rangeEnd(a);
}

/** Whether `range` is a legal placement within a measure and doesn't collide with any other block. */
export function canPlace(blocks: readonly ChordBlock[], range: SlotRange, excludeId?: string): boolean {
  if (!Number.isInteger(range.start) || !Number.isInteger(range.length)) return false;
  if (range.length < 1 || range.length > SLOTS_PER_MEASURE) return false;
  if (range.start < 0 || rangeEnd(range) > SLOTS_PER_MEASURE) return false;
  return !blocks.some(
    (b) => b.id !== excludeId && overlaps(range, { start: b.startSlot, length: b.lengthSlots })
  );
}

/** The first free slot range of `length` at or after `from`, or null if the measure has no room. */
export function firstFreeRange(blocks: readonly ChordBlock[], length: number, from = 0): SlotRange | null {
  for (let start = from; start + length <= SLOTS_PER_MEASURE; start++) {
    const range = { start, length };
    if (canPlace(blocks, range, undefined)) return range;
  }
  return null;
}

/**
 * The largest length (at least 1) starting at `block`'s current start that
 * fits both the measure bound and the next neighboring block, clamped to
 * `requestedLength`. Used by both the bottom-sheet length buttons and the
 * drag-resize handle so they can never disagree (§17).
 */
export function clampResizeLength(blocks: readonly ChordBlock[], blockId: string, requestedLength: number): number {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return requestedLength;
  const requested = Math.max(1, Math.min(SLOTS_PER_MEASURE, Math.round(requestedLength)));
  let maxLength = SLOTS_PER_MEASURE - block.startSlot;
  for (const other of blocks) {
    if (other.id === blockId) continue;
    if (other.startSlot >= block.startSlot) {
      maxLength = Math.min(maxLength, other.startSlot - block.startSlot);
    }
  }
  return Math.max(1, Math.min(requested, maxLength));
}

/**
 * The nearest valid start slot to `targetStart` (within the measure, not
 * overlapping any other block) for a block of `length` slots, excluding
 * `excludeId` from the collision check. Searches outward from the target so
 * a drag snaps to the closest legal gap rather than refusing the drop.
 */
export function nearestValidStart(
  blocks: readonly ChordBlock[],
  length: number,
  targetStart: number,
  excludeId?: string
): number | null {
  const clampedTarget = Math.max(0, Math.min(SLOTS_PER_MEASURE - length, Math.round(targetStart)));
  if (canPlace(blocks, { start: clampedTarget, length }, excludeId)) return clampedTarget;

  for (let radius = 1; radius <= SLOTS_PER_MEASURE; radius++) {
    for (const start of [clampedTarget - radius, clampedTarget + radius]) {
      if (start < 0 || start + length > SLOTS_PER_MEASURE) continue;
      if (canPlace(blocks, { start, length }, excludeId)) return start;
    }
  }
  return null;
}

export function slotToX(slot: number, measureWidth: number): number {
  return (slot / SLOTS_PER_MEASURE) * measureWidth;
}

export function xToSlot(x: number, measureWidth: number): number {
  const raw = Math.round((x / measureWidth) * SLOTS_PER_MEASURE);
  return Math.max(0, Math.min(SLOTS_PER_MEASURE, raw));
}
