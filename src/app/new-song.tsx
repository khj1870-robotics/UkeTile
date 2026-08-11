import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_BPM } from '@/data/song';
import { DEFAULT_STROKE_ID, STROKE_PRESETS, StrokeId } from '@/data/strokePatterns';
import { useSongStore } from '@/state/songStore';
import { colors, radii, spacing } from '@/theme';

const MIN_BPM = 40;
const MAX_BPM = 240;

/** New song creation (§35): title, BPM (default 80), fixed 4/4, default stroke. */
export default function NewSongScreen() {
  const createSong = useSongStore((s) => s.createSong);
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [strokeId, setStrokeId] = useState<StrokeId>(DEFAULT_STROKE_ID);

  const handleCreate = () => {
    const songId = createSong(title.trim() || '제목 없는 곡', bpm, strokeId);
    router.replace(`/song/${songId}/edit`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>새 곡 생성</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>곡 제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="내 노래"
          placeholderTextColor={colors.textDim}
        />

        <Text style={styles.label}>BPM</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={() => setBpm((b) => Math.max(MIN_BPM, b - 5))}>
            <Text style={styles.stepperButtonText}>−5</Text>
          </Pressable>
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Pressable style={styles.stepperButton} onPress={() => setBpm((b) => Math.min(MAX_BPM, b + 5))}>
            <Text style={styles.stepperButtonText}>+5</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>박자</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>4/4</Text>
        </View>

        <Text style={styles.label}>기본 스트로크</Text>
        <View style={styles.strokeRow}>
          {Object.values(STROKE_PRESETS).map((preset) => (
            <Pressable
              key={preset.id}
              style={[styles.strokeChip, strokeId === preset.id && styles.strokeChipActive]}
              onPress={() => setStrokeId(preset.id)}
            >
              <Text style={[styles.strokeChipText, strokeId === preset.id && styles.strokeChipTextActive]}>
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>만들기</Text>
      </Pressable>
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
  form: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 13,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  stepperButtonText: { color: colors.text, fontWeight: '700' },
  bpmValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    minWidth: 56,
    textAlign: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontWeight: '700' },
  strokeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  strokeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  strokeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  strokeChipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  strokeChipTextActive: { color: colors.accentText },
  createButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createButtonText: { color: colors.accentText, fontWeight: '800', fontSize: 16 },
});
