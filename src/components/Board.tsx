import React, { useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { BoardTile } from '@/components/BoardTile';
import { EmptySlot } from '@/components/EmptySlot';
import { Cell, cellKey, rowCount } from '@/lib/grid';
import { BOARD_COLS, TileData } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

/** Screen bounds + scroll offset of the board container, kept fresh via passive layout/scroll events (never an imperative measure call) so a palette drag can hit-test against it at drop time. */
export interface BoardLayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollY: number;
}

interface Props {
  tiles: TileData[];
  /** True while one or more chords are armed for placement from the palette. */
  hasArmed: boolean;
  /** While true, tiles are tap-only and toggle selection instead of playing/dragging. */
  selectMode: boolean;
  selectedIds: ReadonlySet<string>;
  onTapTile: (tileId: string) => void;
  onLongPressMenu: (tileId: string, x: number, y: number) => void;
  onMoveTile: (tileId: string, target: Cell) => void;
  onDuplicateTile: (tileId: string) => void;
  onSlotPress: (col: number, row: number) => void;
  /** Written on layout/scroll for the palette's drag-drop hit test; read only at drop time. */
  layoutRef?: React.MutableRefObject<BoardLayoutRect>;
}

const MIN_VISIBLE_ROWS = 5;

/**
 * A fixed grid of visible slots — filled ones show a tile, empty ones show a
 * dashed placeholder you can tap to place a tile into. Plain flexbox
 * wrapping (no absolute-position pixel math) lays out the grid, packed from
 * the top-left so it never centers/stretches to fill extra vertical space.
 */
export function Board({
  tiles,
  hasArmed,
  selectMode,
  selectedIds,
  onTapTile,
  onLongPressMenu,
  onMoveTile,
  onDuplicateTile,
  onSlotPress,
  layoutRef,
}: Props) {
  const [boardWidth, setBoardWidth] = useState(0);
  const cellSize = boardWidth > 0 ? boardWidth / BOARD_COLS : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setBoardWidth(width);
    if (layoutRef) layoutRef.current = { ...layoutRef.current, x, y, width, height };
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (layoutRef) layoutRef.current = { ...layoutRef.current, scrollY: e.nativeEvent.contentOffset.y };
  };

  const rows = rowCount(tiles, MIN_VISIBLE_ROWS);
  const byCell = new Map(tiles.map((tile) => [cellKey(tile), tile]));

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cellSize > 0 && (
        <ScrollView contentContainerStyle={styles.grid} onScroll={onScroll} scrollEventThrottle={16}>
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: BOARD_COLS }, (_, col) => {
              const tile = byCell.get(cellKey({ col, row }));
              const inner = cellSize - spacing.xs * 2;
              return (
                <View key={`${col},${row}`} style={{ width: cellSize, height: cellSize, padding: spacing.xs }}>
                  {tile ? (
                    <BoardTile
                      chordId={tile.chordId}
                      size={inner}
                      cellSize={cellSize}
                      col={col}
                      row={row}
                      selectMode={selectMode}
                      selected={selectedIds.has(tile.id)}
                      onTap={() => onTapTile(tile.id)}
                      onLongPressMenu={(x, y) => onLongPressMenu(tile.id, x, y)}
                      onMove={(target) => onMoveTile(tile.id, target)}
                      onDuplicate={() => onDuplicateTile(tile.id)}
                    />
                  ) : (
                    <EmptySlot size={inner} active={hasArmed} onPress={() => onSlotPress(col, row)} />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
});
