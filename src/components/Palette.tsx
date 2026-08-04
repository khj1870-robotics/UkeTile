import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DraggableTile } from '@/components/DraggableTile';
import { chordsForRoot, ROOTS } from '@/data/chords';
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

/**
 * Two-level chord picker: pick a root (C, D, E, ...), then hold and drag one
 * of its variants (m, 7, sus4, ...) onto the board.
 */
export function Palette({ board, ghost, onTap, onDrop }: Props) {
  const [rootId, setRootId] = useState(ROOTS[0].id);
  const variants = chordsForRoot(rootId);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rootRow}
      >
        {ROOTS.map((root) => (
          <Pressable
            key={root.id}
            style={[styles.rootChip, root.id === rootId && styles.rootChipActive]}
            onPress={() => setRootId(root.id)}
          >
            <Text style={[styles.rootChipText, root.id === rootId && styles.rootChipTextActive]}>
              {root.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {variants.map((chord) => (
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
  rootRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  rootChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  rootChipActive: {
    backgroundColor: colors.accent,
  },
  rootChipText: {
    color: colors.textDim,
    fontWeight: '700',
  },
  rootChipTextActive: {
    color: colors.accentText,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
