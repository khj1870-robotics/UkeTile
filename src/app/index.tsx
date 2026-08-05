import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/Board';
import { BoardsSheet } from '@/components/BoardsSheet';
import { Palette } from '@/components/Palette';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { playChord } from '@/lib/player';
import { useActiveBoard, useBoardStore } from '@/state/boardStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';

export default function DashboardScreen() {
  /** Chords queued for placement from the palette, in placement order. */
  const [armedQueue, setArmedQueue] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ tileId: string; x: number; y: number } | null>(null);
  const [boardsSheetOpen, setBoardsSheetOpen] = useState(false);

  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const moveTile = useBoardStore((s) => s.moveTile);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeGroup = useBoardStore((s) => s.removeGroup);
  const createBoard = useBoardStore((s) => s.createBoard);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const toggleLeftHanded = useSettingsStore((s) => s.toggleLeftHanded);

  const handlePaletteTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
    setArmedQueue((prev) => {
      if (multiSelect) {
        return prev.includes(chordId) ? prev.filter((id) => id !== chordId) : [...prev, chordId];
      }
      return prev.length === 1 && prev[0] === chordId ? [] : [chordId];
    });
  };

  const handleToggleMultiSelect = () => {
    setMultiSelect((prev) => !prev);
    setArmedQueue([]);
  };

  const handleTileTap = (tileId: string) => {
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handleSlotPress = (col: number, row: number) => {
    if (armedQueue.length === 0) return;
    // Each call auto-avoids cells the previous ones just filled, so the
    // whole queue lands together, magnet-style, starting from this cell.
    for (const chordId of armedQueue) {
      addTile(chordId, { col, row });
    }
    setArmedQueue([]);
  };

  // Android hardware/gesture back: dismiss whatever's in-progress on screen
  // instead of exiting the app. Only intercepts when there's actually
  // something to dismiss — otherwise falls through to the default behavior.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (boardsSheetOpen) {
        setBoardsSheetOpen(false);
        return true;
      }
      if (contextMenu) {
        setContextMenu(null);
        return true;
      }
      if (armedQueue.length > 0) {
        setArmedQueue([]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [boardsSheetOpen, contextMenu, armedQueue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>UkeTile</Text>
          <Pressable onPress={toggleLeftHanded} style={styles.handToggle}>
            <Text style={styles.handToggleText}>{leftHanded ? '왼손잡이' : '오른손잡이'}</Text>
          </Pressable>
        </View>
        {armedQueue.length > 0 ? (
          <View style={styles.armedRow}>
            <Text style={styles.armedText}>
              {armedQueue.length > 1 ? `${armedQueue.length}개 ` : ''}빈 칸을 탭해 배치하세요
            </Text>
            <Pressable onPress={() => setArmedQueue([])}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setBoardsSheetOpen(true)}>
            <Text style={styles.subtitle}>{activeBoard.name} ▾</Text>
          </Pressable>
        )}
      </View>

      <Board
        tiles={activeBoard.tiles}
        hasArmed={armedQueue.length > 0}
        onTapTile={handleTileTap}
        onLongPressMenu={(tileId, x, y) => setContextMenu({ tileId, x, y })}
        onMoveTile={(tileId, target) => moveTile(tileId, target)}
        onDuplicateTile={(tileId) => duplicateGroup(tileId)}
        onSlotPress={handleSlotPress}
      />

      <Palette
        armedQueue={armedQueue}
        multiSelect={multiSelect}
        onToggleMultiSelect={handleToggleMultiSelect}
        onTap={handlePaletteTap}
      />

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

      {boardsSheetOpen && (
        <BoardsSheet
          boards={boards}
          activeBoardId={activeBoardId}
          onSelect={(boardId) => {
            setActiveBoard(boardId);
            setBoardsSheetOpen(false);
          }}
          onRename={renameBoard}
          onDelete={deleteBoard}
          onCreate={() => {
            createBoard(`보드 ${boards.length + 1}`);
            setBoardsSheetOpen(false);
          }}
          onDismiss={() => setBoardsSheetOpen(false)}
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
