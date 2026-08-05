import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/Board';
import { Palette } from '@/components/Palette';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { playChord } from '@/lib/player';
import { useActiveBoard, useBoardStore } from '@/state/boardStore';
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>UkeTile</Text>
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
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  armedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  armedText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  cancelText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
});
