import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

import { BoardMetricsHandle } from '@/hooks/useBoardMetrics';
import { GhostControlsHandle, GhostTileSpec } from '@/hooks/useGhostControls';
import { DraggableTile } from '@/components/DraggableTile';
import { groupShape, rowCount } from '@/lib/grid';
import { TileData } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

interface Props {
  tiles: TileData[];
  cellSize: number;
  board: BoardMetricsHandle;
  ghost: GhostControlsHandle;
  onTapTile: (tileId: string) => void;
  onDropTile: (tileId: string, col: number, row: number) => void;
  onLongPressMenu: (tileId: string, x: number, y: number) => void;
}

const MIN_VISIBLE_ROWS = 5;

/** The drag-ghost shape for the whole magnet group `tileId` belongs to. */
function ghostShapeFor(tiles: TileData[], tileId: string, cellSize: number) {
  const shape = groupShape(tiles, tileId);
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  if (!shape) {
    const tile = byId.get(tileId);
    const specs: GhostTileSpec[] = tile ? [{ chordId: tile.chordId, dCol: 0, dRow: 0 }] : [];
    return { tiles: specs, cellSize };
  }
  const specs: GhostTileSpec[] = [...shape].map(([id, offset]) => ({
    chordId: byId.get(id)!.chordId,
    dCol: offset.col,
    dRow: offset.row,
  }));
  return { tiles: specs, cellSize };
}

export function Board({ tiles, cellSize, board, ghost, onTapTile, onDropTile, onLongPressMenu }: Props) {
  const rows = rowCount(tiles, MIN_VISIBLE_ROWS);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    board.scrollY.value = event.contentOffset.y;
  });

  return (
    <View ref={board.ref} style={styles.container} onLayout={board.measure}>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        <View style={[styles.grid, { height: rows * cellSize }]}>
          {tiles.map((tile) => (
            <View
              key={tile.id}
              style={{
                position: 'absolute',
                left: tile.col * cellSize,
                top: tile.row * cellSize,
                width: cellSize,
                height: cellSize,
                padding: spacing.xs,
              }}
            >
              <DraggableTile
                chordId={tile.chordId}
                size={cellSize - spacing.xs * 2}
                board={board}
                ghost={ghost}
                getGroupShape={() => ghostShapeFor(tiles, tile.id, cellSize)}
                onTap={() => onTapTile(tile.id)}
                onDrop={(col, row) => onDropTile(tile.id, col, row)}
                onLongPressMenu={(x, y) => onLongPressMenu(tile.id, x, y)}
              />
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  grid: { position: 'relative', width: '100%' },
});
