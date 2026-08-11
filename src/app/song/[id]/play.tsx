import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentChordPanel } from '@/components/CurrentChordPanel';
import { NextChordPreview } from '@/components/NextChordPreview';
import { PerformanceTimeline } from '@/components/PerformanceTimeline';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TransportBar } from '@/components/TransportBar';
import { getChord } from '@/data/chords';
import { buildTimeline, PlaybackScheduler, TimelineBlock } from '@/lib/playbackEngine';
import { playChord } from '@/lib/player';
import { playClick } from '@/lib/metronome';
import { useSettingsStore } from '@/state/settingsStore';
import { useSong, useSongStore } from '@/state/songStore';
import { colors, spacing } from '@/theme';

export default function PlayScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = useSong(id);
  const updateSongMeta = useSongStore((s) => s.updateSongMeta);
  const countInEnabled = useSettingsStore((s) => s.countInEnabled);

  const songRef = useRef(song);
  songRef.current = song;

  const [isPlaying, setIsPlaying] = useState(false);
  const [loopOn, setLoopOn] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<TimelineBlock | null>(null);
  const [countInRemaining, setCountInRemaining] = useState<number | null>(null);
  const schedulerRef = useRef<PlaybackScheduler | null>(null);

  const timeline = useMemo(() => {
    if (!song) return null;
    return buildTimeline(song);
  }, [song?.bpm, song?.defaultStrokeId, song?.measures]);

  useEffect(() => {
    if (!timeline) return;
    const scheduler = new PlaybackScheduler(timeline, {
      isMetronomeOn: () => songRef.current?.metronomeOn ?? false,
      isChordSoundOn: () => songRef.current?.chordSoundOn ?? false,
      onStrum: (event) => {
        const chord = getChord(event.chordId);
        if (chord) playChord(chord, event.direction);
      },
      onMetronome: (event) => playClick(event.accent),
      onBlockChange: (block) => setCurrentBlock(block),
      onProgress: () => {},
      onFinish: () => setIsPlaying(false),
      onCountIn: (remaining) => setCountInRemaining(remaining),
      onCountInDone: () => setCountInRemaining(null),
      loop: loopOn,
    });
    schedulerRef.current = scheduler;
    return () => scheduler.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  useEffect(() => {
    schedulerRef.current?.setLoop(loopOn);
  }, [loopOn]);

  if (!song || !timeline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.missing}>곡을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentChord = currentBlock ? getChord(currentBlock.chordId) : null;
  const nextBlock = currentBlock ? timeline.blocks.find((b) => b.order === currentBlock.order + 1) : timeline.blocks[0];
  const nextChord = nextBlock ? getChord(nextBlock.chordId) : null;
  const measureNumber = (currentBlock?.measureIndex ?? 0) + 1;

  const handlePlayPause = () => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    if (isPlaying) {
      scheduler.pause();
      setIsPlaying(false);
    } else {
      scheduler.play(undefined, countInEnabled);
      setIsPlaying(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            schedulerRef.current?.pause();
            router.back();
          }}
        >
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>연주 모드</Text>
        <Text style={styles.measureCounter}>
          {measureNumber} / {song.measures.length} 마디
        </Text>
      </View>

      <TransportBar
        bpm={song.bpm}
        onChangeBpm={(bpm) => updateSongMeta(song.id, { bpm })}
        metronomeOn={song.metronomeOn}
        onToggleMetronome={() => updateSongMeta(song.id, { metronomeOn: !song.metronomeOn })}
        chordSoundOn={song.chordSoundOn}
        onToggleChordSound={() => updateSongMeta(song.id, { chordSoundOn: !song.chordSoundOn })}
      />

      <View style={styles.stage}>
        <CurrentChordPanel chord={currentChord ?? null} pattern={currentBlock?.pattern ?? null} diagramWidth={280} />
        <NextChordPreview chord={nextChord ?? null} />
      </View>

      <PerformanceTimeline
        blocks={timeline.blocks}
        currentOrder={currentBlock?.order ?? null}
        onSelect={(order) => schedulerRef.current?.seekToBlockOrder(order)}
      />

      {countInRemaining !== null && (
        <View style={styles.countInBanner}>
          <Text style={styles.countInText}>카운트 인 {countInRemaining}</Text>
        </View>
      )}

      <PlaybackControls
        isPlaying={isPlaying}
        onPrevious={() => schedulerRef.current?.previous()}
        onPlayPause={handlePlayPause}
        onNext={() => schedulerRef.current?.next()}
        loopOn={loopOn}
        onToggleLoop={() => setLoopOn((v) => !v)}
        metronomeOn={song.metronomeOn}
        onToggleMetronome={() => updateSongMeta(song.id, { metronomeOn: !song.metronomeOn })}
        chordSoundOn={song.chordSoundOn}
        onToggleChordSound={() => updateSongMeta(song.id, { chordSoundOn: !song.chordSoundOn })}
      />
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
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  measureCounter: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  countInBanner: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  countInText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 18,
  },
});
