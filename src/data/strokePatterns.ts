// Strumming presets (§21). A pattern is 8 entries, one per timing-grid slot
// (half-beat) of a 4/4 measure — 'D' (down), 'U' (up), or null (no strum).
// When a chord block plays, only the entries within its own [startSlot,
// startSlot + lengthSlots) range fire, so a 4-beat chord strums repeatedly
// and a half-beat chord only gets whatever fits (§20).

export type StrokeHit = 'D' | 'U' | null;
export type StrokePattern = readonly [
  StrokeHit, StrokeHit, StrokeHit, StrokeHit,
  StrokeHit, StrokeHit, StrokeHit, StrokeHit,
];

export type StrokeId = 'basic' | 'pop' | 'ballad' | 'custom';

export interface StrokePreset {
  id: StrokeId;
  label: string;
  pattern: StrokePattern;
}

export const STROKE_PRESETS: Record<Exclude<StrokeId, 'custom'>, StrokePreset> = {
  basic: {
    id: 'basic',
    label: '기본',
    pattern: ['D', null, 'D', null, 'D', null, 'D', null],
  },
  pop: {
    id: 'pop',
    label: '팝',
    // "↓ ↓↑ ↑↓↑" over 1 & 2 & 3 & 4 &
    pattern: ['D', null, 'D', 'U', 'U', null, 'D', 'U'],
  },
  ballad: {
    id: 'ballad',
    label: '발라드',
    pattern: ['D', null, null, null, 'D', 'U', null, 'U'],
  },
};

export const DEFAULT_STROKE_ID: StrokeId = 'basic';

/** All-null pattern, the starting point for a custom per-block stroke. */
export const BLANK_PATTERN: StrokePattern = [null, null, null, null, null, null, null, null];

/** Resolves a pattern for display/playback: presets look up their fixed pattern, 'custom' uses the stored one. */
export function resolvePattern(strokeId: StrokeId, customPattern?: StrokePattern): StrokePattern {
  if (strokeId === 'custom') return customPattern ?? BLANK_PATTERN;
  return STROKE_PRESETS[strokeId].pattern;
}

/** Arrow glyphs for a pattern, in order, skipping rests — e.g. "↓ ↓↑ ↑↓↑". */
export function patternArrows(pattern: StrokePattern, range?: { start: number; length: number }): string {
  const start = range?.start ?? 0;
  const end = range ? start + range.length : pattern.length;
  const glyphs: string[] = [];
  for (let i = start; i < end; i++) {
    const hit = pattern[i % pattern.length];
    if (hit === 'D') glyphs.push('↓');
    else if (hit === 'U') glyphs.push('↑');
  }
  return glyphs.join(' ');
}
