import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { Chord } from '@/data/chords';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, paletteForRootPc, radii, spacing } from '@/theme';

interface Props {
  chord: Chord | null;
}

/** Smaller preview of the upcoming chord, so the player can preset their hand shape (§27). */
export function NextChordPreview({ chord }: Props) {
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  if (!chord) return null;
  const palette = paletteForRootPc(chord.rootPc);

  return (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={styles.label}>다음 코드</Text>
      <Text style={[styles.name, { color: palette.accent }]}>{chord.name}</Text>
      <ChordDiagram chord={chord} width={90} mirrored={leftHanded} dotColor={palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  label: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 11,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
});
