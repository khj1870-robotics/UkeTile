import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme';

interface Props {
  size: number;
  /** True while something (a palette chord or a board tile) is waiting to be placed. */
  active: boolean;
  onPress: () => void;
}

/** An empty grid cell. Tappable (and highlighted) only while something is armed for placement. */
export function EmptySlot({ size, active, onPress }: Props) {
  return (
    <Pressable
      onPress={active ? onPress : undefined}
      style={[styles.slot, { width: size, height: size }, active && styles.slotActive]}
    />
  );
}

const styles = StyleSheet.create({
  slot: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  slotActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(244, 162, 89, 0.12)',
  },
});
