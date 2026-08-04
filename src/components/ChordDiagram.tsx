import React from 'react';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { Chord } from '@/data/chords';
import { colors } from '@/theme';

interface Props {
  chord: Chord;
  /** Rendered width in px; height follows a 6:7 ratio. */
  width: number;
}

const FRET_ROWS = 4;

/**
 * A standard vertical ukulele chord chart: 4 strings (G C E A left to right),
 * nut on top, finger dots on fretted strings, open circles above open strings.
 */
export function ChordDiagram({ chord, width }: Props) {
  const height = (width * 7) / 6;
  const paddingX = width * 0.14;
  const paddingTop = height * 0.18;
  const paddingBottom = height * 0.08;

  const gridWidth = width - paddingX * 2;
  const gridHeight = height - paddingTop - paddingBottom;
  const stringGap = gridWidth / 3;
  const fretGap = gridHeight / FRET_ROWS;
  const dotRadius = Math.min(stringGap, fretGap) * 0.32;

  const stringX = (string: number) => paddingX + string * stringGap;

  return (
    <Svg width={width} height={height} testID={`chord-diagram-${chord.id}`}>
      {/* Nut */}
      <Rect
        x={paddingX - 1}
        y={paddingTop - 3}
        width={gridWidth + 2}
        height={3}
        fill={colors.text}
        rx={1}
      />
      {/* Frets */}
      {Array.from({ length: FRET_ROWS }, (_, i) => (
        <Line
          key={`fret-${i}`}
          x1={paddingX}
          y1={paddingTop + (i + 1) * fretGap}
          x2={paddingX + gridWidth}
          y2={paddingTop + (i + 1) * fretGap}
          stroke={colors.textDim}
          strokeWidth={1}
        />
      ))}
      {/* Strings */}
      {Array.from({ length: 4 }, (_, string) => (
        <Line
          key={`string-${string}`}
          x1={stringX(string)}
          y1={paddingTop}
          x2={stringX(string)}
          y2={paddingTop + gridHeight}
          stroke={colors.text}
          strokeWidth={1.2}
        />
      ))}
      {/* Open markers and finger dots */}
      {chord.frets.map((fret, string) =>
        fret === 0 ? (
          <Circle
            key={`marker-${string}`}
            cx={stringX(string)}
            cy={paddingTop - height * 0.09}
            r={dotRadius * 0.7}
            stroke={colors.textDim}
            strokeWidth={1.2}
            fill="none"
          />
        ) : (
          <Circle
            key={`marker-${string}`}
            cx={stringX(string)}
            cy={paddingTop + (fret - 0.5) * fretGap}
            r={dotRadius}
            fill={colors.accent}
          />
        )
      )}
    </Svg>
  );
}
