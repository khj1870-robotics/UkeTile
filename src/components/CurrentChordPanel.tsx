import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { Chord } from '@/data/chords';
import { StrokePattern, patternArrows } from '@/data/strokePatterns';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, paletteForRootPc, spacing } from '@/theme';

interface Props {
  chord: Chord | null;
  pattern: StrokePattern | null;
  diagramWidth: number;
}

/** The dominant element of the performance screen (§26/§28): huge current chord + diagram + stroke. */
export function CurrentChordPanel({ chord, pattern, diagramWidth }: Props) {
  const leftHanded = useSettingsStore((s) => s.leftHanded);

  if (!chord) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>코드 없음</Text>
      </View>
    );
  }

  const palette = paletteForRootPc(chord.rootPc);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>현재 코드</Text>
      <Text style={[styles.name, { color: palette.accent }]}>{chord.name}</Text>
      <ChordDiagram chord={chord} width={diagramWidth} mirrored={leftHanded} dotColor={palette.accent} showFingerNumbers />
      {pattern && <Text style={styles.arrows}>{patternArrows(pattern) || '—'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 13,
  },
  name: {
    fontSize: 56,
    fontWeight: '900',
    marginVertical: spacing.xs,
  },
  arrows: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  placeholder: {
    color: colors.textDim,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: spacing.xl,
  },
});
