import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { Chord } from '@/data/chords';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, paletteForRootPc, radii, spacing } from '@/theme';

interface Props {
  chord: Chord;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
}

/** A small chord card — name + a mini horizontal diagram — used in the palette and pickers (§18). */
export function MiniChordCard({ chord, size = 84, selected = false, onPress }: Props) {
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const palette = paletteForRootPc(chord.rootPc);

  const card = (
    <View
      style={[
        styles.card,
        { width: size, height: size, backgroundColor: palette.bg, borderColor: selected ? colors.accent : palette.border },
        selected && styles.selected,
      ]}
    >
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {chord.name}
      </Text>
      <ChordDiagram chord={chord} width={size * 0.8} mirrored={leftHanded} dotColor={palette.accent} />
    </View>
  );

  if (!onPress) return card;
  return <Pressable onPress={onPress}>{card}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  selected: {
    borderWidth: 3,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
