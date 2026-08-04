import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DraggableTile } from '@/components/DraggableTile';
import { CHORDS } from '@/data/chords';
import { BoardMetricsHandle } from '@/hooks/useBoardMetrics';
import { GhostControlsHandle } from '@/hooks/useGhostControls';
import { colors, spacing } from '@/theme';

export const PALETTE_TILE_SIZE = 84;

interface Props {
  board: BoardMetricsHandle;
  ghost: GhostControlsHandle;
  onTap: (chordId: string) => void;
  onDrop: (chordId: string, col: number, row: number) => void;
}

/** Horizontal shelf of source tiles; hold and drag one onto the board to place it. */
export function Palette({ board, ghost, onTap, onDrop }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {CHORDS.map((chord) => (
          <DraggableTile
            key={chord.id}
            chordId={chord.id}
            size={PALETTE_TILE_SIZE}
            board={board}
            ghost={ghost}
            onTap={() => onTap(chord.id)}
            onDrop={(col, row) => onDrop(chord.id, col, row)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
