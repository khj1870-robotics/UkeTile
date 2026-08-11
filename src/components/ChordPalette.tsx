import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MiniChordCard } from '@/components/MiniChordCard';
import { chordsForRoot, ROOTS } from '@/data/chords';
import { playChord } from '@/lib/player';
import { colors, radii, spacing } from '@/theme';

const NATURAL_IDS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_IDS = ['C#', 'D#', 'F#', 'G#', 'A#'];

interface Props {
  /** Chord id currently armed for tap-to-place, if any. */
  armedChordId: string | null;
  onArm: (chordId: string) => void;
}

/**
 * Root-first chord picker (§9/§10/§11): pick a root note, then one of its
 * quality variants. Major/Minor/7 is deliberately not the top-level split —
 * that's explicitly forbidden (§39). Tapping a variant arms it and plays a
 * preview; tap an empty measure slot next to place it (§19's tap-to-place).
 */
export function ChordPalette({ armedChordId, onArm }: Props) {
  const [rootId, setRootId] = useState('C');
  const [showSharps, setShowSharps] = useState(false);
  const variants = chordsForRoot(rootId);

  const handleSelectRoot = (id: string) => setRootId(id);

  const handleSelectVariant = (chordId: string) => {
    const chord = variants.find((c) => c.id === chordId);
    if (chord) playChord(chord);
    onArm(chordId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.rootRow}>
        {NATURAL_IDS.map((id) => (
          <RootChip key={id} label={id} active={id === rootId} onPress={() => handleSelectRoot(id)} />
        ))}
        <Pressable
          style={[styles.sharpToggle, showSharps && styles.sharpToggleActive]}
          onPress={() => setShowSharps((v) => !v)}
        >
          <Text style={[styles.sharpToggleText, showSharps && styles.sharpToggleTextActive]}>♯/♭</Text>
        </Pressable>
      </View>
      {showSharps && (
        <View style={styles.rootRow}>
          {SHARP_IDS.map((id) => {
            const root = ROOTS.find((r) => r.id === id)!;
            return (
              <RootChip key={id} label={root.label} active={id === rootId} onPress={() => handleSelectRoot(id)} />
            );
          })}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantRow}>
        {variants.map((chord) => (
          <MiniChordCard
            key={chord.id}
            chord={chord}
            selected={chord.id === armedChordId}
            onPress={() => handleSelectVariant(chord.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RootChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.rootChip, active && styles.rootChipActive]} onPress={onPress}>
      <Text style={[styles.rootChipText, active && styles.rootChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  rootRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  rootChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  rootChipActive: {
    backgroundColor: colors.accent,
  },
  rootChipText: {
    color: colors.textDim,
    fontWeight: '700',
  },
  rootChipTextActive: {
    color: colors.accentText,
  },
  sharpToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  sharpToggleActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
    borderStyle: 'solid',
  },
  sharpToggleText: {
    color: colors.textDim,
    fontWeight: '700',
  },
  sharpToggleTextActive: {
    color: colors.accent,
  },
  variantRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
