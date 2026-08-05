import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/Board';
import { Palette } from '@/components/Palette';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { playChord } from '@/lib/player';
import { useActiveBoard, useBoardStore } from '@/state/boardStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';

export default function DashboardScreen() {
  /** The chord currently armed for placement from the palette, if any. */
  const [armedChordId, setArmedChordId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ tileId: string; x: number; y: number } | null>(null);

  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const moveTile = useBoardStore((s) => s.moveTile);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeGroup = useBoardStore((s) => s.removeGroup);
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const toggleLeftHanded = useSettingsStore((s) => s.toggleLeftHanded);

  const handlePaletteTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
    setArmedChordId((prev) => (prev === chordId ? null : chordId));
  };

  const handleTileTap = (tileId: string) => {
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handleSlotPress = (col: number, row: number) => {
    if (!armedChordId) return;
    addTile(armedChordId, { col, row });
    setArmedChordId(null);
  };

  // Android hardware/gesture back: dismiss whatever's in-progress on screen
  // instead of exiting the app. Only intercepts when there's actually
  // something to dismiss — otherwise falls through to the default behavior.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (contextMenu) {
        setContextMenu(null);
        return true;
      }
      if (armedChordId) {
        setArmedChordId(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [contextMenu, armedChordId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>UkeTile</Text>
          <Pressable onPress={toggleLeftHanded} style={styles.handToggle}>
            <Text style={styles.handToggleText}>{leftHanded ? '왼손잡이' : '오른손잡이'}</Text>
          </Pressable>
        </View>
        {armedChordId ? (
          <View style={styles.armedRow}>
            <Text style={styles.armedText}>빈 칸을 탭해 배치하세요</Text>
            <Pressable onPress={() => setArmedChordId(null)}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.subtitle}>{activeBoard.name}</Text>
        )}
      </View>

      <Board
        tiles={activeBoard.tiles}
        armedChordId={armedChordId}
        onTapTile={handleTileTap}
        onLongPressMenu={(tileId, x, y) => setContextMenu({ tileId, x, y })}
        onMoveTile={(tileId, target) => moveTile(tileId, target)}
        onSlotPress={handleSlotPress}
      />

      <Palette armedChordId={armedChordId} onTap={handlePaletteTap} />

      {contextMenu && (
        <TileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDuplicate={() => {
            duplicateGroup(contextMenu.tileId);
            setContextMenu(null);
          }}
          onDelete={() => {
            removeGroup(contextMenu.tileId);
            setContextMenu(null);
          }}
          onDismiss={() => setContextMenu(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  handToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  handToggleText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  armedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  armedText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  cancelText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
});
