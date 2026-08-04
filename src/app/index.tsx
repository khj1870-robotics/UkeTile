import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Board } from '@/components/Board';
import { DragGhost } from '@/components/DragGhost';
import { Palette } from '@/components/Palette';
import { SelectionToolbar } from '@/components/SelectionToolbar';
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
  const [selectionMode, setSelectionMode] = useState(false);

  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const moveTile = useBoardStore((s) => s.moveTile);
  const removeTiles = useBoardStore((s) => s.removeTiles);
  const duplicateTiles = useBoardStore((s) => s.duplicateTiles);
  const toggleSelected = useBoardStore((s) => s.toggleSelected);
  const clearSelection = useBoardStore((s) => s.clearSelection);
  const selectedIds = useBoardStore((s) => s.selectedIds);

  const cellSize = boardWidth > 0 ? boardWidth / BOARD_COLS : 0;

  const handleTileTap = (tileId: string) => {
    if (selectionMode) {
      toggleSelected(tileId);
      return;
    }
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handlePaletteTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) clearSelection();
      return !prev;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>UkeTile</Text>
        <Text style={styles.subtitle}>{activeBoard.name}</Text>
      </View>

      <SelectionToolbar
        selectionMode={selectionMode}
        selectedCount={selectedIds.length}
        onToggleMode={toggleSelectionMode}
        onDuplicate={() => duplicateTiles(selectedIds)}
        onDelete={() => removeTiles(selectedIds)}
      />

      {cellSize > 0 && (
        <Board
          tiles={activeBoard.tiles}
          cellSize={cellSize}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          board={board}
          ghost={ghost}
          onTapTile={handleTileTap}
          onDropTile={(tileId, col, row) => moveTile(tileId, { col, row })}
        />
      )}

      <Palette
        board={board}
        ghost={ghost}
        onTap={handlePaletteTap}
        onDrop={(chordId, col, row) => addTile(chordId, { col, row })}
      />

      <DragGhost x={ghost.x} y={ghost.y} opacity={ghost.opacity} chordId={ghost.chordId} size={ghost.size} />
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
