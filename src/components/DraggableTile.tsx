import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';
import { BOARD_COLS } from '@/state/boardStore';
import { pointToCell } from '@/lib/grid';

/** Window-space board container geometry + scroll offset, read by drag worklets. */
export interface BoardMetrics {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  scrollY: SharedValue<number>;
}

/** Position/visibility for the floating tile that follows the finger while dragging. */
export interface GhostControls {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  show: (chordId: string, size: number) => void;
  hide: () => void;
}

interface Props {
  chordId: string;
  size: number;
  selected?: boolean;
  /** Selection mode: dragging is disabled, tap toggles selection instead. */
  disabled?: boolean;
  board: BoardMetrics;
  ghost: GhostControls;
  onTap: () => void;
  onDrop: (col: number, row: number) => void;
}

/**
 * A chord tile that can be tapped (play sound / toggle selection) or held and
 * dragged onto the board. Requires a brief hold before the drag activates so
 * it plays nicely inside the palette's and board's scroll views.
 */
export function DraggableTile({ chordId, size, selected, disabled, board, ghost, onTap, onDrop }: Props) {
  const chord = getChord(chordId);
  const hiddenWhileDragging = useSharedValue(0);

  const resolveDrop = (relX: number, relY: number, boardWidth: number) => {
    const cellSize = boardWidth / BOARD_COLS;
    const cell = pointToCell(relX, relY, cellSize, BOARD_COLS);
    onDrop(cell.col, cell.row);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart((e) => {
      hiddenWhileDragging.value = 1;
      ghost.opacity.value = 1;
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
      runOnJS(ghost.show)(chordId, size);
    })
    .onUpdate((e) => {
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
    })
    .onEnd((e) => {
      const withinX = e.absoluteX >= board.x.value && e.absoluteX <= board.x.value + board.width.value;
      const withinY = e.absoluteY >= board.y.value && e.absoluteY <= board.y.value + board.height.value;
      if (withinX && withinY) {
        const relX = e.absoluteX - board.x.value;
        const relY = e.absoluteY - board.y.value + board.scrollY.value;
        runOnJS(resolveDrop)(relX, relY, board.width.value);
      }
    })
    .onFinalize(() => {
      hiddenWhileDragging.value = 0;
      ghost.opacity.value = 0;
      runOnJS(ghost.hide)();
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const gesture = disabled ? tap : Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: hiddenWhileDragging.value ? 0 : 1,
  }));

  if (!chord) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <TileCard chord={chord} size={size} selected={selected} />
      </Animated.View>
    </GestureDetector>
  );
}
