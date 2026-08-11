import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChordBottomSheet } from '@/components/ChordBottomSheet';
import { ChordPalette } from '@/components/ChordPalette';
import { StaffMeasure } from '@/components/StaffMeasure';
import { TransportBar } from '@/components/TransportBar';
import { ChordBlock } from '@/data/song';
import { useSong, useSongStore } from '@/state/songStore';
import { colors, spacing } from '@/theme';

function findBlock(measures: { blocks: ChordBlock[] }[], blockId: string): ChordBlock | null {
  for (const measure of measures) {
    const block = measure.blocks.find((b) => b.id === blockId);
    if (block) return block;
  }
  return null;
}

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = useSong(id);
  const updateSongMeta = useSongStore((s) => s.updateSongMeta);
  const addMeasure = useSongStore((s) => s.addMeasure);

  const [armedChordId, setArmedChordId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedBlockId) {
        setSelectedBlockId(null);
        return true;
      }
      if (armedChordId) {
        setArmedChordId(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedBlockId, armedChordId]);

  if (!song) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.missing}>곡을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const selectedBlock = selectedBlockId ? findBlock(song.measures, selectedBlockId) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Pressable onPress={() => Alert.alert('저장됨', '곡이 자동으로 저장되었습니다.')}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>
      </View>

      <TransportBar
        bpm={song.bpm}
        onChangeBpm={(bpm) => updateSongMeta(song.id, { bpm })}
        metronomeOn={song.metronomeOn}
        onToggleMetronome={() => updateSongMeta(song.id, { metronomeOn: !song.metronomeOn })}
        chordSoundOn={song.chordSoundOn}
        onToggleChordSound={() => updateSongMeta(song.id, { chordSoundOn: !song.chordSoundOn })}
        onPlay={() => router.push(`/song/${song.id}/play`)}
      />

      <ScrollView style={styles.staffScroll} contentContainerStyle={styles.staffContent}>
        {song.measures.map((measure, i) => (
          <StaffMeasure
            key={measure.id}
            songId={song.id}
            measureIndex={i}
            measureNumber={i + 1}
            blocks={measure.blocks}
            measureCount={song.measures.length}
            defaultStrokeId={song.defaultStrokeId}
            armedChordId={armedChordId}
            selectedBlockId={selectedBlockId}
            onArmedPlaced={() => setArmedChordId(null)}
            onSelectBlock={(blockId) => setSelectedBlockId(blockId)}
          />
        ))}
        <Pressable style={styles.addMeasure} onPress={() => addMeasure(song.id)}>
          <Text style={styles.addMeasureText}>+ 마디 추가</Text>
        </Pressable>
      </ScrollView>

      {armedChordId && (
        <View style={styles.armedBanner}>
          <Text style={styles.armedBannerText}>빈 칸을 탭해 배치하세요</Text>
          <Pressable onPress={() => setArmedChordId(null)}>
            <Text style={styles.armedBannerCancel}>취소</Text>
          </Pressable>
        </View>
      )}

      {selectedBlock ? (
        <ChordBottomSheet song={song} block={selectedBlock} onClose={() => setSelectedBlockId(null)} />
      ) : (
        <ChordPalette armedChordId={armedChordId} onArm={setArmedChordId} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  missing: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerIcon: { color: colors.text, fontSize: 20, fontWeight: '700' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  saveText: { color: colors.accent, fontWeight: '700' },
  staffScroll: { flex: 1 },
  staffContent: { paddingVertical: spacing.sm },
  addMeasure: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  addMeasureText: { color: colors.textDim, fontWeight: '700' },
  armedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceRaised,
  },
  armedBannerText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  armedBannerCancel: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
});
