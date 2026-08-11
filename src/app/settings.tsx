import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/state/settingsStore';
import { colors, radii, spacing } from '@/theme';

function SettingRow({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Pressable style={[styles.toggle, on && styles.toggleOn]} onPress={onPress}>
        <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{on ? 'ON' : 'OFF'}</Text>
      </Pressable>
    </View>
  );
}

/** §설정: left-handed diagram mirroring, count-in on/off. */
export default function SettingsScreen() {
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const toggleLeftHanded = useSettingsStore((s) => s.toggleLeftHanded);
  const countInEnabled = useSettingsStore((s) => s.countInEnabled);
  const toggleCountIn = useSettingsStore((s) => s.toggleCountIn);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.list}>
        <SettingRow label="왼손잡이 (운지법 좌우 반전)" on={leftHanded} onPress={toggleLeftHanded} />
        <SettingRow label="카운트 인" on={countInEnabled} onPress={toggleCountIn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerIcon: { color: colors.text, fontSize: 20, fontWeight: '700' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: { color: colors.text, fontWeight: '600', fontSize: 15, flex: 1, marginRight: spacing.sm },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: colors.selection, borderColor: colors.selection },
  toggleText: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
  toggleTextOn: { color: colors.accentText },
});
