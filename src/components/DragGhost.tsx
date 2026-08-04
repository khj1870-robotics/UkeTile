import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';

interface Props {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  chordId: string | null;
  size: number;
}

/**
 * Floating tile that tracks the finger during a drag. Rendered once, at the
 * top of the screen (assumes its container starts at the window origin — true
 * for this app's single full-bleed screen).
 */
export function DragGhost({ x, y, opacity, chordId, size }: Props) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  const chord = chordId ? getChord(chordId) : undefined;
  if (!chord) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.ghost, style]}>
      <TileCard chord={chord} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
