import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, BoardLayoutRect } from '@/components/Board';
import { BoardsSheet } from '@/components/BoardsSheet';
import { Palette } from '@/components/Palette';
import { SheetLayoutRect, SheetView } from '@/components/SheetView';
import { TileContextMenu } from '@/components/TileContextMenu';
import { getChord } from '@/data/chords';
import { playChord } from '@/lib/player';
import { BOARD_COLS, useActiveBoard, useBoardStore } from '@/state/boardStore';
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

  const boardLayoutRef = useRef<BoardLayoutRect>({ x: 0, y: 0, width: 0, height: 0, scrollY: 0 });
  const sheetLayoutRef = useRef<SheetLayoutRect>({ x: 0, y: 0, width: 0, height: 0, scrollY: 0, lineBounds: new Map() });

  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const activeBoard = useActiveBoard();
  const addTile = useBoardStore((s) => s.addTile);
  const addTiles = useBoardStore((s) => s.addTiles);
  const moveTile = useBoardStore((s) => s.moveTile);
  const duplicateTile = useBoardStore((s) => s.duplicateTile);
  const duplicateGroup = useBoardStore((s) => s.duplicateGroup);
  const removeTiles = useBoardStore((s) => s.removeTiles);
  const removeGroup = useBoardStore((s) => s.removeGroup);
  const clearBoard = useBoardStore((s) => s.clearBoard);
  const addChordToMeasure = useBoardStore((s) => s.addChordToMeasure);
  const addChordToLine = useBoardStore((s) => s.addChordToLine);
  const removeChordFromMeasure = useBoardStore((s) => s.removeChordFromMeasure);
  const addMeasure = useBoardStore((s) => s.addMeasure);
  const addLine = useBoardStore((s) => s.addLine);
  const moveLineTo = useBoardStore((s) => s.moveLineTo);
  const duplicateLine = useBoardStore((s) => s.duplicateLine);
  const deleteLine = useBoardStore((s) => s.deleteLine);
  const createBoard = useBoardStore((s) => s.createBoard);
  const createSheetBoard = useBoardStore((s) => s.createSheetBoard);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const leftHanded = useSettingsStore((s) => s.leftHanded);
  const toggleLeftHanded = useSettingsStore((s) => s.toggleLeftHanded);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);

  const isGrid = activeBoard.type === 'grid';

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
    if (activeBoard.type !== 'grid') return;
    const tile = activeBoard.tiles.find((t) => t.id === tileId);
    const chord = tile && getChord(tile.chordId);
    if (chord) playChord(chord);
  };

  const handleSlotPress = (col: number, row: number) => {
    if (armedQueue.length === 0) return;
    addTiles(armedQueue, { col, row });
    setArmedQueue([]);
  };

  const handleMeasureTap = (lineId: string, measureId: string) => {
    if (armedQueue.length === 0) return;
    for (const chordId of armedQueue) {
      addChordToMeasure(lineId, measureId, chordId);
    }
    setArmedQueue([]);
  };

  // Palette drag-drop: hit-test the drop point against whichever board is
  // active, using bounds gathered passively via onLayout/onScroll (never an
  // imperative measure call) — the same reliability principle as BoardTile's
  // relative-delta move, just applied to an absolute drop point since the
  // gesture starts outside the board and has no "known starting cell".
  const handlePaletteDrop = (chordId: string, screenX: number, screenY: number) => {
    if (activeBoard.type === 'grid') {
      const rect = boardLayoutRef.current;
      if (rect.width <= 0 || rect.height <= 0) return;
      if (screenX < rect.x || screenX > rect.x + rect.width) return;
      if (screenY < rect.y || screenY > rect.y + rect.height) return;
      const cellSize = rect.width / BOARD_COLS;
      const col = Math.floor((screenX - rect.x) / cellSize);
      const row = Math.floor((screenY - rect.y + rect.scrollY) / cellSize);
      addTile(chordId, { col, row });
    } else {
      const rect = sheetLayoutRef.current;
      if (rect.width <= 0 || rect.height <= 0) return;
      if (screenX < rect.x || screenX > rect.x + rect.width) return;
      if (screenY < rect.y || screenY > rect.y + rect.height) return;
      const contentY = screenY - rect.y + rect.scrollY;
      for (const [lineId, bounds] of rect.lineBounds) {
        if (contentY >= bounds.y && contentY <= bounds.y + bounds.height) {
          addChordToLine(lineId, chordId);
          break;
        }
      }
    }
  };

  const handleMeasureChordTap = (chordId: string) => {
    const chord = getChord(chordId);
    if (chord) playChord(chord);
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
    if (activeBoard.type !== 'grid' || activeBoard.tiles.length === 0) return;
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
          <View style={styles.toggleGroup}>
            <Pressable onPress={toggleLeftHanded} style={styles.handToggle}>
              <Text style={styles.handToggleText}>{leftHanded ? '왼손잡이' : '오른손잡이'}</Text>
            </Pressable>
          </View>
          <View style={styles.titleCenterWrap} pointerEvents="none">
            <Text style={styles.title}>UkeTile</Text>
          </View>
          <View style={styles.toggleGroup}>
            <Pressable onPress={toggleSound} style={styles.iconToggle}>
              <Text style={styles.iconToggleText}>{soundEnabled ? '🔊' : '🔇'}</Text>
            </Pressable>
            <Pressable disabled style={styles.iconToggle}>
              <Text style={[styles.iconToggleText, styles.iconInactive]}>🎵</Text>
            </Pressable>
            <Pressable disabled style={styles.iconToggle}>
              <Text style={[styles.iconToggleText, styles.iconInactive]}>▶</Text>
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
              {armedQueue.length > 1 ? `${armedQueue.length}개 ` : ''}
              {isGrid ? '빈 칸을' : '마디를'} 탭해 배치하세요
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
            {isGrid && (
              <View style={styles.toggleGroup}>
                <Pressable onPress={handleToggleDeleteMode}>
                  <Text style={styles.linkText}>선택삭제</Text>
                </Pressable>
                <Pressable onPress={confirmClearBoard}>
                  <Text style={styles.dangerText}>전체삭제</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {activeBoard.type === 'grid' ? (
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
          layoutRef={boardLayoutRef}
        />
      ) : (
        <SheetView
          board={activeBoard}
          hasArmed={armedQueue.length > 0}
          onMeasureTap={handleMeasureTap}
          onChordTap={handleMeasureChordTap}
          onRemoveChord={removeChordFromMeasure}
          onAddMeasure={addMeasure}
          onDuplicateLine={duplicateLine}
          onDeleteLine={deleteLine}
          onMoveLineTo={moveLineTo}
          onAddLine={addLine}
          layoutRef={sheetLayoutRef}
        />
      )}

      <Palette
        armedQueue={armedQueue}
        multiSelect={multiSelect}
        onToggleMultiSelect={handleToggleMultiSelect}
        onTap={handlePaletteTap}
        onDropChord={handlePaletteDrop}
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
          onCreateGrid={() => {
            createBoard(`보드 ${boards.length + 1}`, 'grid');
            setBoardsSheetOpen(false);
          }}
          onCreateSheet={(timeSignature) => {
            createSheetBoard(`악보 ${boards.length + 1}`, timeSignature);
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
    position: 'relative',
  },
  titleCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  iconInactive: { opacity: 0.35 },
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
