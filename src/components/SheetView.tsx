import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getChord } from '@/data/chords';
import { SheetBoard, SheetLine } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

interface Props {
  board: SheetBoard;
  hasArmed: boolean;
  onMeasureTap: (lineId: string, measureId: string) => void;
  onChordTap: (chordId: string) => void;
  onRemoveChord: (lineId: string, measureId: string, index: number) => void;
  onAddMeasure: (lineId: string) => void;
  onMoveLine: (lineId: string, direction: 'up' | 'down') => void;
  onDuplicateLine: (lineId: string) => void;
  onDeleteLine: (lineId: string) => void;
  onAddLine: () => void;
}

/** A numbered sheet-music-style line: bar-separated measures, each holding one or more chords. */
function LineRow({
  line,
  index,
  lineCount,
  hasArmed,
  onMeasureTap,
  onChordTap,
  onRemoveChord,
  onAddMeasure,
  onMoveLine,
  onDuplicateLine,
  onDeleteLine,
}: {
  line: SheetLine;
  index: number;
  lineCount: number;
} & Omit<Props, 'board' | 'onAddLine'>) {
  return (
    <View style={styles.lineRow}>
      <View style={styles.lineHeader}>
        <Text style={styles.lineNumber}>{index + 1}</Text>
        <View style={styles.lineControls}>
          <Pressable disabled={index === 0} onPress={() => onMoveLine(line.id, 'up')}>
            <Text style={[styles.lineControlText, index === 0 && styles.disabled]}>▲</Text>
          </Pressable>
          <Pressable disabled={index === lineCount - 1} onPress={() => onMoveLine(line.id, 'down')}>
            <Text style={[styles.lineControlText, index === lineCount - 1 && styles.disabled]}>▼</Text>
          </Pressable>
          <Pressable onPress={() => onDuplicateLine(line.id)}>
            <Text style={styles.lineControlText}>복제</Text>
          </Pressable>
          <Pressable disabled={lineCount <= 1} onPress={() => onDeleteLine(line.id)}>
            <Text style={[styles.lineControlText, styles.dangerText, lineCount <= 1 && styles.disabled]}>삭제</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.measureRow}>
        {line.measures.map((measure) => (
          <Pressable
            key={measure.id}
            style={[styles.measure, hasArmed && styles.measureActive]}
            onPress={() => onMeasureTap(line.id, measure.id)}
          >
            {measure.chordIds.length === 0 ? (
              <Text style={styles.measurePlaceholder}>+</Text>
            ) : (
              measure.chordIds.map((chordId, i) => {
                const chord = getChord(chordId);
                return (
                  <View key={`${chordId}-${i}`} style={styles.chip}>
                    <Pressable onPress={() => onChordTap(chordId)}>
                      <Text style={styles.chipText}>{chord?.name ?? chordId}</Text>
                    </Pressable>
                    <Pressable onPress={() => onRemoveChord(line.id, measure.id, i)} hitSlop={8}>
                      <Text style={styles.chipRemove}>×</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </Pressable>
        ))}
        <Pressable style={styles.addMeasure} onPress={() => onAddMeasure(line.id)}>
          <Text style={styles.addMeasureText}>+마디</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/**
 * Sheet-music-style board: numbered lines of bar-separated measures. A
 * measure normally holds one chord; tapping it while a chord is armed
 * appends another slot, so mid-measure chord changes are just extra taps.
 */
export function SheetView({
  board,
  hasArmed,
  onMeasureTap,
  onChordTap,
  onRemoveChord,
  onAddMeasure,
  onMoveLine,
  onDuplicateLine,
  onDeleteLine,
  onAddLine,
}: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {board.lines.map((line, index) => (
        <LineRow
          key={line.id}
          line={line}
          index={index}
          lineCount={board.lines.length}
          hasArmed={hasArmed}
          onMeasureTap={onMeasureTap}
          onChordTap={onChordTap}
          onRemoveChord={onRemoveChord}
          onAddMeasure={onAddMeasure}
          onMoveLine={onMoveLine}
          onDuplicateLine={onDuplicateLine}
          onDeleteLine={onDeleteLine}
        />
      ))}
      <Pressable style={styles.addLine} onPress={onAddLine}>
        <Text style={styles.addLineText}>+ 줄 추가</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  lineRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  lineNumber: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  lineControls: { flexDirection: 'row', gap: spacing.md },
  lineControlText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  dangerText: { color: colors.danger },
  disabled: { opacity: 0.3 },
  measureRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  measure: {
    minWidth: 84,
    minHeight: 84,
    borderWidth: 2,
    borderColor: colors.border,
    borderRightWidth: 3,
    borderRightColor: colors.text,
    borderRadius: 8,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  measureActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(244, 162, 89, 0.12)',
  },
  measurePlaceholder: { color: colors.border, fontSize: 20, fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    gap: 4,
  },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chipRemove: { color: colors.textDim, fontSize: 13, fontWeight: '800' },
  addMeasure: {
    minWidth: 56,
    minHeight: 84,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMeasureText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  addLine: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  addLineText: { color: colors.textDim, fontWeight: '800' },
});
