import React from 'react';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { Chord } from '@/data/chords';
import { colors } from '@/theme';

interface Props {
  chord: Chord;
  /** Rendered width in px; height follows a horizontal (wider-than-tall) ratio. */
  width: number;
  /** Left-handed mode: mirrors the whole diagram horizontally (nut on the right). */
  mirrored?: boolean;
}

const FRET_COLS = 4;

/**
 * A horizontal ukulele chord chart: nut on the left, frets running rightward.
 * Strings run A (top) to G (bottom) — the correct 90°-counterclockwise
 * rotation of a standard nut-on-top chart (where strings read G-C-E-A
 * left-to-right). An earlier version kept G-C-E-A top-to-bottom after
 * rotating, which isn't a true rotation of the original chart — it read
 * mirrored/backwards.
 */
export function ChordDiagram({ chord, width, mirrored = false }: Props) {
  const height = width * 0.58;
  const paddingLeft = width * 0.16;
  const paddingRight = width * 0.06;
  const paddingV = height * 0.14;

  const gridWidth = width - paddingLeft - paddingRight;
  const gridHeight = height - paddingV * 2;
  const stringGap = gridHeight / 3;
  const fretGap = gridWidth / FRET_COLS;
  const dotRadius = Math.min(stringGap, fretGap) * 0.32;

  // string 0=G .. 3=A in the data; displayed top-to-bottom as A,E,C,G.
  const stringY = (string: number) => paddingV + (3 - string) * stringGap;

  const content = (
    <>
      {/* Nut */}
      <Rect
        x={paddingLeft - 3}
        y={paddingV - 1}
        width={3}
        height={gridHeight + 2}
        fill={colors.text}
        rx={1}
      />
      {/* Frets */}
      {Array.from({ length: FRET_COLS }, (_, i) => (
        <Line
          key={`fret-${i}`}
          x1={paddingLeft + (i + 1) * fretGap}
          y1={paddingV}
          x2={paddingLeft + (i + 1) * fretGap}
          y2={paddingV + gridHeight}
          stroke={colors.textDim}
          strokeWidth={1}
        />
      ))}
      {/* Strings */}
      {Array.from({ length: 4 }, (_, string) => (
        <Line
          key={`string-${string}`}
          x1={paddingLeft}
          y1={stringY(string)}
          x2={paddingLeft + gridWidth}
          y2={stringY(string)}
          stroke={colors.text}
          strokeWidth={1.2}
        />
      ))}
      {/* Open markers and finger dots */}
      {chord.frets.map((fret, string) =>
        fret === 0 ? (
          <Circle
            key={`marker-${string}`}
            cx={paddingLeft - width * 0.08}
            cy={stringY(string)}
            r={dotRadius * 0.7}
            stroke={colors.textDim}
            strokeWidth={1.2}
            fill="none"
          />
        ) : (
          <Circle
            key={`marker-${string}`}
            cx={paddingLeft + (fret - 0.5) * fretGap}
            cy={stringY(string)}
            r={dotRadius}
            fill={colors.accent}
          />
        )
      )}
    </>
  );

  return (
    <Svg width={width} height={height} testID={`chord-diagram-${chord.id}`}>
      {mirrored ? <G transform={`translate(${width}, 0) scale(-1, 1)`}>{content}</G> : content}
    </Svg>
  );
}
