import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';
import { GhostTileSpec } from '@/hooks/useGhostControls';
import { spacing } from '@/theme';

interface Props {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  tiles: GhostTileSpec[];
  cellSize: number;
}

/**
 * Floating tile (or whole magnet group) that tracks the finger during a drag.
 * Rendered once, at the top of the screen (assumes its container starts at the
 * window origin — true for this app's single full-bleed screen).
 */
export function DragGhost({ x, y, opacity, tiles, cellSize }: Props) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  if (tiles.length === 0 || cellSize <= 0) return null;
  const tileSize = cellSize - spacing.xs * 2;

  return (
    <Animated.View pointerEvents="none" style={[styles.root, style]}>
      {tiles.map((spec, index) => {
        const chord = getChord(spec.chordId);
        if (!chord) return null;
        return (
          <Animated.View
            key={`${spec.chordId}-${index}`}
            style={[
              styles.tile,
              { left: spec.dCol * cellSize + spacing.xs, top: spec.dRow * cellSize + spacing.xs },
            ]}
          >
            <TileCard chord={chord} size={tileSize} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tile: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
