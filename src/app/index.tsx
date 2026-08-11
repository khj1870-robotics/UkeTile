import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Song } from '@/data/song';
import { useSongStore } from '@/state/songStore';
import { colors, radii, spacing } from '@/theme';

function formatRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function SongCard({ song }: { song: Song }) {
  const measureCount = song.measures.length;
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/song/${song.id}/edit`)}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {song.title}
      </Text>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMeta}>BPM {song.bpm}</Text>
        <Text style={styles.cardMeta}>{measureCount}마디</Text>
        <Text style={styles.cardMeta}>{formatRelative(song.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const songs = useSongStore((s) => s.songs);
  const sorted = [...songs].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>UkeTile</Text>
        <Pressable onPress={() => router.push('/settings')}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionLabel}>내 곡</Text>

      <FlatList
        data={sorted}
        keyExtractor={(song) => song.id}
        renderItem={({ item }) => <SongCard song={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>아직 곡이 없어요. 새 곡을 만들어보세요.</Text>}
      />

      <Pressable style={styles.newSongButton} onPress={() => router.push('/new-song')}>
        <Text style={styles.newSongButtonText}>+ 새 곡</Text>
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
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  settingsIcon: { color: colors.textDim, fontSize: 22 },
  sectionLabel: {
    color: colors.textDim,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', gap: spacing.md },
  cardMeta: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  empty: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  newSongButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  newSongButtonText: { color: colors.accentText, fontWeight: '800', fontSize: 15 },
});
