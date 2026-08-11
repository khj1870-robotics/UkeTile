import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface Props {
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
  chordSoundOn: boolean;
  onToggleChordSound: () => void;
  /** Shown as a round play button at the end of the bar when provided (edit screen → performance mode). */
  onPlay?: () => void;
  /** Extra chip rendered at the end, e.g. the "1 / 4 마디" counter on the performance screen. */
  trailing?: React.ReactNode;
}

const MIN_BPM = 40;
const MAX_BPM = 240;

/** Shared BPM / 4-4 / metronome / chord-sound row (§14/§25) — independent toggles per §23. */
export function TransportBar({
  bpm,
  onChangeBpm,
  metronomeOn,
  onToggleMetronome,
  chordSoundOn,
  onToggleChordSound,
  onPlay,
  trailing,
}: Props) {
  const [editingBpm, setEditingBpm] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.chip} onPress={() => setEditingBpm(true)}>
        <Text style={styles.chipText}>BPM {bpm}</Text>
      </Pressable>
      <View style={styles.chip}>
        <Text style={styles.chipText}>4/4</Text>
      </View>
      <ToggleChip label="메트로놈" on={metronomeOn} onPress={onToggleMetronome} />
      <ToggleChip label="코드 사운드" on={chordSoundOn} onPress={onToggleChordSound} />
      {trailing}
      <View style={{ flex: 1 }} />
      {onPlay && (
        <Pressable style={styles.playButton} onPress={onPlay}>
          <View style={styles.playTriangle} />
        </Pressable>
      )}

      <Modal visible={editingBpm} transparent animationType="fade" onRequestClose={() => setEditingBpm(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingBpm(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalLabel}>BPM</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => onChangeBpm(Math.max(MIN_BPM, bpm - 5))}
              >
                <Text style={styles.stepperButtonText}>−5</Text>
              </Pressable>
              <Pressable
                style={styles.stepperButton}
                onPress={() => onChangeBpm(Math.max(MIN_BPM, bpm - 1))}
              >
                <Text style={styles.stepperButtonText}>−1</Text>
              </Pressable>
              <Text style={styles.bpmValue}>{bpm}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => onChangeBpm(Math.min(MAX_BPM, bpm + 1))}
              >
                <Text style={styles.stepperButtonText}>+1</Text>
              </Pressable>
              <Pressable
                style={styles.stepperButton}
                onPress={() => onChangeBpm(Math.min(MAX_BPM, bpm + 5))}
              >
                <Text style={styles.stepperButtonText}>+5</Text>
              </Pressable>
            </View>
            <Pressable style={styles.doneButton} onPress={() => setEditingBpm(false)}>
              <Text style={styles.doneButtonText}>완료</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToggleChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
      <View style={[styles.dot, on && styles.dotOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotOn: {
    backgroundColor: colors.selection,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.accentText,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(35,35,54,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    minWidth: 260,
    alignItems: 'center',
  },
  modalLabel: {
    color: colors.textDim,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  stepperButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  bpmValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    minWidth: 56,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  doneButtonText: {
    color: colors.accentText,
    fontWeight: '700',
  },
});
