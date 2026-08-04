import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Board } from '@/components/Board';
import { DragGhost } from '@/components/DragGhost';
import { Palette } from '@/components/Palette';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { useBoardMetrics } from '@/hooks/useBoardMetrics';
import { useGhostControls } from '@/hooks/useGhostControls';
import { playChord } from '@/lib/player';
import { BOARD_COLS, useActiveBoard, useBoardStore } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

export default function DashboardScreen() {
  const [boardWidth, setBoardWidth] = useState(0);
  const board = useBoardMetrics(setBoardWidth);
  const ghost = useGhostControls();
  const [contextMenu, setContextMenu] = useState<{ tileId: string; x: number; y: number } | null>(null);

  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const moveGroup = useBoardStore((s) => s.moveGroup);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeGroup = useBoardStore((s) => s.removeGroup);

  const cellSize = boardWidth > 0 ? boardWidth / BOARD_COLS : 0;

  const handleTileTap = (tileId: string) => {
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handlePaletteTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>UkeTile</Text>
        <Text style={styles.subtitle}>{activeBoard.name}</Text>
      </View>

      {cellSize > 0 && (
        <Board
          tiles={activeBoard.tiles}
          cellSize={cellSize}
          board={board}
          ghost={ghost}
          onTapTile={handleTileTap}
          onDropTile={(tileId, col, row) => moveGroup(tileId, { col, row })}
          onLongPressMenu={(tileId, x, y) => setContextMenu({ tileId, x, y })}
        />
      )}

      <Palette
        board={board}
        ghost={ghost}
        onTap={handlePaletteTap}
        onDrop={(chordId, col, row) => addTile(chordId, { col, row })}
      />

      <DragGhost x={ghost.x} y={ghost.y} opacity={ghost.opacity} tiles={ghost.tiles} cellSize={ghost.cellSize} />

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
});
