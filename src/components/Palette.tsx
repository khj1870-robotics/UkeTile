import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { Chord, chordsForRoot, ROOTS } from '@/data/chords';
import { colors, spacing } from '@/theme';

export const PALETTE_TILE_SIZE = 84;

interface Props {
  /** Chords currently queued for placement, in placement order (highlighted). */
  armedQueue: string[];
  multiSelect: boolean;
  onToggleMultiSelect: () => void;
  onTap: (chordId: string) => void;
  /** A palette tile was dragged and released at this screen position — try to drop it there. */
  onDropChord: (chordId: string, screenX: number, screenY: number) => void;
}

/**
 * A palette tile that can be tapped (arms it for tap-to-place, as before) or
 * dragged directly onto a board slot / sheet measure. The drag itself reuses
 * `BoardTile`'s proven pattern: the tile just follows the finger visually via
 * `translationX/Y`, and only the gesture's native `absoluteX/Y` (never a
 * one-shot window measurement) is reported to the caller at drop time, which
 * hit-tests it against the target's passively-collected layout.
 */
function PaletteTile({
  chord,
  selected,
  onTap,
  onDrop,
}: {
  chord: Chord;
  selected: boolean;
  onTap: () => void;
  onDrop: (screenX: number, screenY: number) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(60)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDrop)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      dragging.value = 0;
      translateX.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(0, { duration: 150 });
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex: dragging.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <TileCard chord={chord} size={PALETTE_TILE_SIZE} selected={selected} />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Two-level chord picker: pick a root (C, D, E, ...), then tap one of its
 * variants (m, 7, sus4, ...) to arm it for placement — tap an empty board
 * slot next to place it there. With multi-select on, tapping several
 * variants queues them all; the next empty-slot tap places every queued
 * chord at once (they auto-fill the nearest free cells, magnet-style). A
 * variant tile can also be dragged straight onto a slot/measure instead.
 */
export function Palette({ armedQueue, multiSelect, onToggleMultiSelect, onTap, onDropChord }: Props) {
  const [rootId, setRootId] = useState(ROOTS[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const variants = chordsForRoot(rootId);

  return (
    <View style={styles.container}>
      <View style={styles.rootRowWrap}>
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
        <Pressable
          style={[styles.multiToggle, multiSelect && styles.multiToggleActive]}
          onPress={onToggleMultiSelect}
        >
          <Text style={[styles.multiToggleText, multiSelect && styles.multiToggleTextActive]}>
            {multiSelect ? `여러개 선택 중 (${armedQueue.length})` : '여러개 선택'}
          </Text>
        </Pressable>
        <Pressable style={styles.collapseToggle} onPress={() => setCollapsed((prev) => !prev)}>
          <Text style={styles.collapseToggleText}>{collapsed ? '▲' : '▼'}</Text>
        </Pressable>
      </View>
      {!collapsed && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
          {variants.map((chord) => (
            <PaletteTile
              key={chord.id}
              chord={chord}
              selected={armedQueue.includes(chord.id)}
              onTap={() => onTap(chord.id)}
              onDrop={(x, y) => onDropChord(chord.id, x, y)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rootRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
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
  multiToggle: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  multiToggleActive: {
    backgroundColor: colors.selection,
  },
  multiToggleText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  multiToggleTextActive: {
    color: colors.accentText,
  },
  collapseToggle: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  collapseToggleText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
