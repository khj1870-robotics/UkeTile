import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

interface Props {
  /** Screen position (window coordinates) the menu should anchor near. */
  x: number;
  y: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}

const MENU_WIDTH = 160;
const MENU_HEIGHT = 96;

/** Popup shown when a tile (or its whole magnet group) is held still — duplicate/delete. */
export function TileContextMenu({ x, y, onDuplicate, onDelete, onDismiss }: Props) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const left = Math.min(Math.max(spacing.md, x - MENU_WIDTH / 2), screenWidth - MENU_WIDTH - spacing.md);
  const top = Math.min(y, screenHeight - MENU_HEIGHT - spacing.md);

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <View style={[styles.menu, { left, top }]}>
        <Pressable style={styles.row} onPress={onDuplicate}>
          <Text style={styles.rowText}>복제</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.row} onPress={onDelete}>
          <Text style={[styles.rowText, styles.dangerText]}>삭제</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  dangerText: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
