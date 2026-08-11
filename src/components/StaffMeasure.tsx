import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChordBlockTile } from '@/components/ChordBlockTile';
import { ChordBlock, SLOTS_PER_MEASURE } from '@/data/song';
import { StrokeId } from '@/data/strokePatterns';
import { useSongStore } from '@/state/songStore';
import { colors, radii, spacing } from '@/theme';

export const MEASURE_HEIGHT = 100;
const SLOT_LABELS = ['1', '&', '2', '&', '3', '&', '4', '&'];

interface Props {
  songId: string;
  measureIndex: number;
  measureNumber: number;
  blocks: ChordBlock[];
  measureCount: number;
  defaultStrokeId: StrokeId;
  armedChordId: string | null;
  selectedBlockId: string | null;
  onArmedPlaced: () => void;
  onSelectBlock: (blockId: string) => void;
}

/**
 * One measure: number, a faint 5-line staff backdrop, the 1 & 2 & 3 & 4 &
 * slot ruler, and the chord blocks — all positioned by slot math, never free
 * pixel coordinates (§15). Empty slot cells are tappable while a chord is
 * armed from the palette (§19's tap-to-place).
 */
export function StaffMeasure({
  songId,
  measureIndex,
  measureNumber,
  blocks,
  measureCount,
  defaultStrokeId,
  armedChordId,
  selectedBlockId,
  onArmedPlaced,
  onSelectBlock,
}: Props) {
  const [width, setWidth] = useState(0);
  const addChordBlock = useSongStore((s) => s.addChordBlock);
  const cellWidth = width / SLOTS_PER_MEASURE;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const occupiedSlots = new Set<number>();
  for (const block of blocks) {
    for (let s = block.startSlot; s < block.startSlot + block.lengthSlots; s++) occupiedSlots.add(s);
  }

  const handleCellPress = (slot: number) => {
    if (!armedChordId) return;
    addChordBlock(songId, measureIndex, armedChordId, slot);
    onArmedPlaced();
  };

  return (
    <View style={styles.row}>
      <Text style={styles.measureNumber}>{measureNumber}</Text>
      <View style={styles.staffArea} onLayout={onLayout}>
        <View style={styles.ruler}>
          {SLOT_LABELS.map((label, i) => (
            <Text key={i} style={styles.rulerLabel}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.staffLines}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={styles.staffLine} />
          ))}
        </View>
        {width > 0 && (
          <>
            <View style={styles.cellRow}>
              {Array.from({ length: SLOTS_PER_MEASURE }, (_, slot) => (
                <Pressable
                  key={slot}
                  style={[styles.cell, { width: cellWidth }]}
                  disabled={occupiedSlots.has(slot) || !armedChordId}
                  onPress={() => handleCellPress(slot)}
                >
                  {!occupiedSlots.has(slot) && armedChordId && <View style={styles.cellHint} />}
                </Pressable>
              ))}
            </View>
            {blocks.map((block) => (
              <ChordBlockTile
                key={block.id}
                songId={songId}
                block={block}
                measureIndex={measureIndex}
                measureCount={measureCount}
                defaultStrokeId={defaultStrokeId}
                measureWidth={width}
                measureHeight={MEASURE_HEIGHT}
                selected={block.id === selectedBlockId}
                onSelect={() => onSelectBlock(block.id)}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  measureNumber: {
    width: 20,
    paddingTop: 2,
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 12,
  },
  staffArea: {
    flex: 1,
    height: MEASURE_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ruler: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  rulerLabel: {
    color: colors.textDim,
    fontSize: 9,
    width: 12,
    textAlign: 'center',
  },
  staffLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 24,
    bottom: 8,
    justifyContent: 'space-between',
  },
  staffLine: {
    height: 1,
    backgroundColor: colors.staffLine,
  },
  cellRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 16,
    bottom: 0,
    flexDirection: 'row',
  },
  cell: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHint: {
    width: '70%',
    height: '55%',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    opacity: 0.5,
  },
});
