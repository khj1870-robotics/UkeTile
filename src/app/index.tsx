import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const activeBoard = useActiveBoard();
  const addTiles = useBoardStore((s) => s.addTiles);
  const moveTile = useBoardStore((s) => s.moveTile);
  const duplicateTile = useBoardStore((s) => s.duplicateTile);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeTiles = useBoardStore((s) => s.removeTiles);
  const removeGroup = useBoardStore((s) => s.removeGroup);
  const clearBoard = useBoardStore((s) => s.clearBoard);
  const createBoard = useBoardStore((s) => s.createBoard);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const toggleLeftHanded = useSettingsStore((s) => s.toggleLeftHanded);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);

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
    if (deleteMode) {
      setSelectedForDelete((prev) => {
        const next = new Set(prev);
        if (next.has(tileId)) next.delete(tileId);
        else next.add(tileId);
        return next;
      });
      return;
    }
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handleSlotPress = (col: number, row: number) => {
    if (armedQueue.length === 0) return;
    addTiles(armedQueue, { col, row });
    setArmedQueue([]);
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setSelectedForDelete(new Set());
  };

  const confirmDeleteSelected = () => {
    const ids = [...selectedForDelete];
    if (ids.length === 0) return;
    Alert.alert('선택한 타일 삭제', `${ids.length}개 타일을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          removeTiles(ids);
          setSelectedForDelete(new Set());
          setDeleteMode(false);
        },
      },
    ]);
  };

  const confirmClearBoard = () => {
    if (activeBoard.tiles.length === 0) return;
    Alert.alert('전체 삭제', `'${activeBoard.name}'의 타일을 모두 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '전체 삭제', style: 'destructive', onPress: () => clearBoard() },
    ]);
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
      if (deleteMode) {
        setDeleteMode(false);
        setSelectedForDelete(new Set());
        return true;
      }
      if (armedQueue.length > 0) {
        setArmedQueue([]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [boardsSheetOpen, contextMenu, deleteMode, armedQueue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>UkeTile</Text>
          <View style={styles.toggleGroup}>
            <Pressable onPress={toggleSound} style={styles.iconToggle}>
              <Text style={styles.iconToggleText}>{soundEnabled ? '🔊' : '🔇'}</Text>
            </Pressable>
            <Pressable onPress={toggleLeftHanded} style={styles.handToggle}>
              <Text style={styles.handToggleText}>{leftHanded ? '왼손잡이' : '오른손잡이'}</Text>
            </Pressable>
          </View>
        </View>

        {deleteMode ? (
          <View style={styles.armedRow}>
            <Text style={styles.armedText}>{selectedForDelete.size}개 선택됨 · 삭제할 타일을 탭하세요</Text>
            <View style={styles.toggleGroup}>
              <Pressable onPress={confirmDeleteSelected} disabled={selectedForDelete.size === 0}>
                <Text style={[styles.dangerText, selectedForDelete.size === 0 && styles.disabledText]}>삭제</Text>
              </Pressable>
              <Pressable onPress={handleToggleDeleteMode}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
            </View>
          </View>
        ) : armedQueue.length > 0 ? (
          <View style={styles.armedRow}>
            <Text style={styles.armedText}>
              {armedQueue.length > 1 ? `${armedQueue.length}개 ` : ''}빈 칸을 탭해 배치하세요
            </Text>
            <Pressable onPress={() => setArmedQueue([])}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.armedRow}>
            <Pressable onPress={() => setBoardsSheetOpen(true)}>
              <Text style={styles.subtitle}>{activeBoard.name} ▾</Text>
            </Pressable>
            <View style={styles.toggleGroup}>
              <Pressable onPress={handleToggleDeleteMode}>
                <Text style={styles.linkText}>선택삭제</Text>
              </Pressable>
              <Pressable onPress={confirmClearBoard}>
                <Text style={styles.dangerText}>전체삭제</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Board
        tiles={activeBoard.tiles}
        hasArmed={armedQueue.length > 0}
        selectMode={deleteMode}
        selectedIds={selectedForDelete}
        onTapTile={handleTileTap}
        onLongPressMenu={(tileId, x, y) => setContextMenu({ tileId, x, y })}
        onMoveTile={(tileId, target) => moveTile(tileId, target)}
        onDuplicateTile={(tileId) => duplicateTile(tileId)}
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
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 13 },
  iconToggle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  iconToggleText: { fontSize: 16 },
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
    marginTop: spacing.xs,
  },
  armedText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  cancelText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  linkText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  dangerText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  disabledText: { opacity: 0.4 },
});
