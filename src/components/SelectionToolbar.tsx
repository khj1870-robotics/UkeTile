import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

interface Props {
  selectionMode: boolean;
  selectedCount: number;
  onToggleMode: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SelectionToolbar({
  selectionMode,
  selectedCount,
  onToggleMode,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={[styles.button, selectionMode && styles.buttonActive]} onPress={onToggleMode}>
        <Text style={styles.buttonText}>{selectionMode ? '선택 종료' : '선택'}</Text>
      </Pressable>
      {selectionMode && (
        <>
          <Text style={styles.count}>{selectedCount}개 선택됨</Text>
          <Pressable
            style={[styles.button, selectedCount === 0 && styles.buttonDisabled]}
            disabled={selectedCount === 0}
            onPress={onDuplicate}
          >
            <Text style={styles.buttonText}>복제</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonDanger, selectedCount === 0 && styles.buttonDisabled]}
            disabled={selectedCount === 0}
            onPress={onDelete}
          >
            <Text style={styles.buttonText}>삭제</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
  },
  buttonActive: { backgroundColor: colors.accent },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.text, fontWeight: '700' },
  count: { color: colors.textDim, marginLeft: 'auto' },
});
