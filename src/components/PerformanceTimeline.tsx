import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getChord } from '@/data/chords';
import { TimelineBlock } from '@/lib/playbackEngine';
import { colors, paletteForRootPc, radii, spacing } from '@/theme';

interface Props {
  blocks: TimelineBlock[];
  currentOrder: number | null;
  onSelect: (order: number) => void;
}

const CHIP_WIDTH = 68;

/** Condensed strip of the whole song's chord progression with a playhead on the current block (§29). */
export function PerformanceTimeline({ blocks, currentOrder, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (currentOrder === null) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, currentOrder * CHIP_WIDTH - CHIP_WIDTH * 2), animated: true });
  }, [currentOrder]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {blocks.map((block) => {
        const chord = getChord(block.chordId);
        if (!chord) return null;
        const palette = paletteForRootPc(chord.rootPc);
        const active = block.order === currentOrder;
        return (
          <Pressable
            key={block.blockId}
            style={[
              styles.chip,
              { width: CHIP_WIDTH - spacing.xs, backgroundColor: palette.bg, borderColor: active ? colors.accent : palette.border },
              active && styles.chipActive,
            ]}
            onPress={() => onSelect(block.order)}
          >
            <Text style={[styles.chipText, { color: palette.accent }]} numberOfLines={1}>
              {chord.name}
            </Text>
          </Pressable>
        );
      })}
      {blocks.length === 0 && <View style={styles.empty} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderWidth: 2.5,
  },
  chipText: {
    fontWeight: '800',
    fontSize: 13,
  },
  empty: {
    width: 1,
  },
});
