import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { Chord } from '@/data/chords';
import { colors } from '@/theme';

interface Props {
  chord: Chord;
  /** Outer square size in px. */
  size: number;
  selected?: boolean;
}

/** The visual card for a chord tile — used on the board, in the palette and as the drag ghost. */
export function TileCard({ chord, size, selected = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        { width: size, height: size },
        selected && styles.selected,
      ]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {chord.name}
      </Text>
      <ChordDiagram chord={chord} width={size * 0.56} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selected: {
    borderColor: colors.selection,
    backgroundColor: '#2E4237',
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
