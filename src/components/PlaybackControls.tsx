import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface Props {
  isPlaying: boolean;
  onPrevious: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  loopOn: boolean;
  onToggleLoop: () => void;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
  chordSoundOn: boolean;
  onToggleChordSound: () => void;
}

/** Transport controls for the performance screen (§30). */
export function PlaybackControls({
  isPlaying,
  onPrevious,
  onPlayPause,
  onNext,
  loopOn,
  onToggleLoop,
  metronomeOn,
  onToggleMetronome,
  chordSoundOn,
  onToggleChordSound,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.transportRow}>
        <RoundButton label="이전" onPress={onPrevious}>
          <Text style={styles.glyph}>⏮</Text>
        </RoundButton>
        <Pressable style={styles.playButton} onPress={onPlayPause}>
          <Text style={styles.playGlyph}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>
        <RoundButton label="다음" onPress={onNext}>
          <Text style={styles.glyph}>⏭</Text>
        </RoundButton>
        <RoundButton label="반복" onPress={onToggleLoop} active={loopOn}>
          <Text style={[styles.glyph, loopOn && styles.glyphActive]}>🔁</Text>
        </RoundButton>
      </View>
      <View style={styles.toggleRow}>
        <ToggleChip label="메트로놈" on={metronomeOn} onPress={onToggleMetronome} />
        <ToggleChip label="코드 사운드" on={chordSoundOn} onPress={onToggleChordSound} />
      </View>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  active,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.roundButtonWrap}>
      <Pressable style={[styles.roundButton, active && styles.roundButtonActive]} onPress={onPress}>
        {children}
      </Pressable>
      <Text style={styles.roundButtonLabel}>{label}</Text>
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
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  roundButtonWrap: {
    alignItems: 'center',
    gap: 4,
  },
  roundButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roundButtonLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  glyph: {
    fontSize: 20,
    color: colors.text,
  },
  glyphActive: {
    color: colors.accentText,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    fontSize: 28,
    color: colors.accentText,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
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
});
