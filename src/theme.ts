// Bright, pastel, paper-like theme (§36): light background, generous
// whitespace, rounded corners, thin borders — the opposite of a dense DAW UI.

export const colors = {
  background: '#F7F6FB',
  surface: '#FFFFFF',
  surfaceRaised: '#F1EFFA',
  border: '#E2DFF0',
  accent: '#4C7EF3',
  accentText: '#FFFFFF',
  text: '#232336',
  textDim: '#7A7791',
  selection: '#22C55E',
  danger: '#EF4444',
  staffLine: '#E7E4F3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface RootPalette {
  bg: string;
  border: string;
  accent: string;
}

/**
 * A stable pastel color family per root pitch class (§16 — "코드별로
 * pastel 색상"), so a chord's card color depends on its root note, not its
 * position in the song. 12 evenly spaced hues around the wheel.
 */
export function paletteForRootPc(rootPc: number): RootPalette {
  const hue = (rootPc * 30) % 360;
  return {
    bg: hslToHex(hue, 0.62, 0.91),
    border: hslToHex(hue, 0.45, 0.72),
    accent: hslToHex(hue, 0.55, 0.45),
  };
}
