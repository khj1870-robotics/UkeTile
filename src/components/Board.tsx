import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';

import { BoardTile } from '@/components/BoardTile';
import { EmptySlot } from '@/components/EmptySlot';
import { cellKey, rowCount } from '@/lib/grid';
import { BOARD_COLS, TileData } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

export interface Armed {
  kind: 'chord' | 'tile';
  id: string;
}

interface Props {
  tiles: TileData[];
  armed: Armed | null;
  onTapTile: (tileId: string) => void;
  onLongPressMenu: (tileId: string, x: number, y: number) => void;
  onSlotPress: (col: number, row: number) => void;
}

const MIN_VISIBLE_ROWS = 5;

/**
 * A fixed grid of visible slots — filled ones show a tile, empty ones show a
 * dashed placeholder you can tap to place/move a tile into. Plain flexbox
 * wrapping (no absolute-position pixel math) lays out the grid, so there's no
 * window-coordinate measurement anywhere in placement.
 */
export function Board({ tiles, armed, onTapTile, onLongPressMenu, onSlotPress }: Props) {
  const [boardWidth, setBoardWidth] = useState(0);
  const cellSize = boardWidth > 0 ? boardWidth / BOARD_COLS : 0;

  const onLayout = (e: LayoutChangeEvent) => setBoardWidth(e.nativeEvent.layout.width);

  const rows = rowCount(tiles, MIN_VISIBLE_ROWS);
  const byCell = new Map(tiles.map((tile) => [cellKey(tile), tile]));

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cellSize > 0 && (
        <ScrollView contentContainerStyle={styles.grid}>
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
                      onTap={() => onTapTile(tile.id)}
                      onLongPressMenu={(x, y) => onLongPressMenu(tile.id, x, y)}
                    />
                  ) : (
                    <EmptySlot size={inner} active={!!armed} onPress={() => onSlotPress(col, row)} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
