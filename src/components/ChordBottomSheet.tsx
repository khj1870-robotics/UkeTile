import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { getChord } from '@/data/chords';
import { ChordBlock, Song } from '@/data/song';
import { BLANK_PATTERN, STROKE_PRESETS, StrokeId, StrokePattern, resolvePattern } from '@/data/strokePatterns';
import { playChord } from '@/lib/player';
import { useSongStore } from '@/state/songStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, paletteForRootPc, radii, spacing } from '@/theme';

interface Props {
  song: Song;
  block: ChordBlock;
  onClose: () => void;
}

const LENGTH_PRESETS_BEATS = [1, 2, 3, 4];

/** The bottom sheet opened by tapping a chord block (§17). */
export function ChordBottomSheet({ song, block, onClose }: Props) {
  const resizeChordBlock = useSongStore((s) => s.resizeChordBlock);
  const setBlockStroke = useSongStore((s) => s.setBlockStroke);
  const duplicateBlock = useSongStore((s) => s.duplicateBlock);
  const deleteBlock = useSongStore((s) => s.deleteBlock);
  const updateSongMeta = useSongStore((s) => s.updateSongMeta);
  const leftHanded = useSettingsStore((s) => s.leftHanded);

  const chord = getChord(block.chordId);
  if (!chord) return null;
  const palette = paletteForRootPc(chord.rootPc);
  const strokeId: StrokeId = block.strokeId ?? song.defaultStrokeId;
  const customPattern = block.customPattern ?? BLANK_PATTERN;

  const cycleCell = (index: number) => {
    const base = strokeId === 'custom' ? customPattern : resolvePattern(strokeId);
    const hit = base[index];
    const nextHit: 'D' | 'U' | null = hit === null ? 'D' : hit === 'D' ? 'U' : null;
    const mutable: ('D' | 'U' | null)[] = base.slice();
    mutable[index] = nextHit;
    const next = mutable as unknown as StrokePattern;
    setBlockStroke(song.id, block.id, 'custom', next);
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>선택된 코드: </Text>
          <Text style={[styles.chordName, { color: palette.accent }]}>{chord.name}</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => playChord(chord)} style={styles.diagramWrap}>
          <ChordDiagram chord={chord} width={180} mirrored={leftHanded} dotColor={palette.accent} showFingerNumbers />
        </Pressable>

        <Text style={styles.sectionLabel}>길이</Text>
        <View style={styles.buttonRow}>
          {LENGTH_PRESETS_BEATS.map((beats) => {
            const slots = beats * 2;
            const active = block.lengthSlots === slots;
            return (
              <Pressable
                key={beats}
                style={[styles.pillButton, active && styles.pillButtonActive]}
                onPress={() => resizeChordBlock(song.id, block.id, slots)}
              >
                <Text style={[styles.pillButtonText, active && styles.pillButtonTextActive]}>{beats}박</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>스트로크</Text>
        <View style={styles.buttonRow}>
          {Object.values(STROKE_PRESETS).map((preset) => (
            <Pressable
              key={preset.id}
              style={[styles.pillButton, strokeId === preset.id && styles.pillButtonActive]}
              onPress={() => setBlockStroke(song.id, block.id, preset.id)}
            >
              <Text style={[styles.pillButtonText, strokeId === preset.id && styles.pillButtonTextActive]}>
                {preset.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.pillButton, strokeId === 'custom' && styles.pillButtonActive]}
            onPress={() => setBlockStroke(song.id, block.id, 'custom', block.customPattern ?? BLANK_PATTERN)}
          >
            <Text style={[styles.pillButtonText, strokeId === 'custom' && styles.pillButtonTextActive]}>커스텀</Text>
          </Pressable>
        </View>

        {strokeId === 'custom' && (
          <View style={styles.customRow}>
            {customPattern.map((hit, i) => (
              <Pressable key={i} style={styles.customCell} onPress={() => cycleCell(i)}>
                <Text style={styles.customCellText}>{hit === 'D' ? '↓' : hit === 'U' ? '↑' : '·'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.soundRow}>
          <Text style={styles.sectionLabel}>사운드</Text>
          <Pressable
            style={[styles.toggle, song.chordSoundOn && styles.toggleOn]}
            onPress={() => updateSongMeta(song.id, { chordSoundOn: !song.chordSoundOn })}
          >
            <Text style={[styles.toggleText, song.chordSoundOn && styles.toggleTextOn]}>
              {song.chordSoundOn ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.copyButton}
            onPress={() => {
              duplicateBlock(song.id, block.id);
            }}
          >
            <Text style={styles.copyButtonText}>복사</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => {
              deleteBlock(song.id, block.id);
              onClose();
            }}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: 340,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: colors.textDim,
    fontWeight: '700',
  },
  chordName: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeText: {
    color: colors.textDim,
    fontWeight: '700',
  },
  diagramWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pillButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  pillButtonTextActive: {
    color: colors.accentText,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  customCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCellText: {
    color: colors.text,
    fontWeight: '800',
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: {
    backgroundColor: colors.selection,
    borderColor: colors.selection,
  },
  toggleText: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 12,
  },
  toggleTextOn: {
    color: colors.accentText,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  copyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  copyButtonText: {
    color: colors.accent,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
