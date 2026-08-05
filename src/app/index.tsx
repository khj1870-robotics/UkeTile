import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Armed, Board } from '@/components/Board';
import { Palette } from '@/components/Palette';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { playChord } from '@/lib/player';
import { useActiveBoard, useBoardStore } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

export default function DashboardScreen() {
  const [armed, setArmed] = useState<Armed | null>(null);
  const [contextMenu, setContextMenu] = useState<{ tileId: string; x: number; y: number } | null>(null);

  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const moveGroup = useBoardStore((s) => s.moveGroup);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeGroup = useBoardStore((s) => s.removeGroup);

  const handlePaletteTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
    setArmed((prev) => (prev?.kind === 'chord' && prev.id === chordId ? null : { kind: 'chord', id: chordId }));
  };

  const handleTileTap = (tileId: string) => {
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handleSlotPress = (col: number, row: number) => {
    if (!armed) return;
    if (armed.kind === 'chord') {
      addTile(armed.id, { col, row });
    } else {
      moveGroup(armed.id, { col, row });
    }
    setArmed(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>UkeTile</Text>
        {armed ? (
          <View style={styles.armedRow}>
            <Text style={styles.armedText}>빈 칸을 탭해 배치하세요</Text>
            <Pressable onPress={() => setArmed(null)}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.subtitle}>{activeBoard.name}</Text>
        )}
      </View>

      <Board
        tiles={activeBoard.tiles}
        armed={armed}
        onTapTile={handleTileTap}
        onLongPressMenu={(tileId, x, y) => setContextMenu({ tileId, x, y })}
        onSlotPress={handleSlotPress}
      />

      <Palette armedChordId={armed?.kind === 'chord' ? armed.id : null} onTap={handlePaletteTap} />

      {contextMenu && (
        <TileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onMove={() => {
            setArmed({ kind: 'tile', id: contextMenu.tileId });
            setContextMenu(null);
          }}
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
