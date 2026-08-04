import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

import { BoardMetricsHandle } from '@/hooks/useBoardMetrics';
import { GhostControlsHandle } from '@/hooks/useGhostControls';
import { DraggableTile } from '@/components/DraggableTile';
import { rowCount } from '@/lib/grid';
import { TileData } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

interface Props {
  tiles: TileData[];
  cellSize: number;
  selectionMode: boolean;
  selectedIds: string[];
  board: BoardMetricsHandle;
  ghost: GhostControlsHandle;
  onTapTile: (tileId: string) => void;
  onDropTile: (tileId: string, col: number, row: number) => void;
}

const MIN_VISIBLE_ROWS = 5;

export function Board({
  tiles,
  cellSize,
  selectionMode,
  selectedIds,
  board,
  ghost,
  onTapTile,
  onDropTile,
}: Props) {
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
                selected={selectedIds.includes(tile.id)}
                disabled={selectionMode}
                board={board}
                ghost={ghost}
                onTap={() => onTapTile(tile.id)}
                onDrop={(col, row) => onDropTile(tile.id, col, row)}
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
