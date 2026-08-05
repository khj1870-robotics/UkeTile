import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TileCard } from '@/components/TileCard';
import { chordsForRoot, ROOTS } from '@/data/chords';
import { colors, spacing } from '@/theme';

export const PALETTE_TILE_SIZE = 84;

interface Props {
  /** The chord currently armed for placement, if any (highlighted). */
  armedChordId: string | null;
  onTap: (chordId: string) => void;
}

/**
 * Two-level chord picker: pick a root (C, D, E, ...), then tap one of its
 * variants (m, 7, sus4, ...) to arm it for placement — tap an empty board
 * slot next to place it there.
 */
export function Palette({ armedChordId, onTap }: Props) {
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
          <Pressable key={chord.id} onPress={() => onTap(chord.id)}>
            <TileCard chord={chord} size={PALETTE_TILE_SIZE} selected={chord.id === armedChordId} />
          </Pressable>
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
