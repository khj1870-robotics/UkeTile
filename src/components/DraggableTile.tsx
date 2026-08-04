import React, { useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';
import { GhostTileSpec } from '@/hooks/useGhostControls';
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

/** Position/visibility for the floating group shape that follows the finger while dragging. */
export interface GhostControls {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  show: (tiles: GhostTileSpec[], cellSize: number) => void;
  hide: () => void;
}

/** How long (ms) a still hold takes before it's treated as a long-press menu request. */
const MENU_HOLD_MS = 300;
/** Cumulative finger movement (px) under which a hold still counts as "still". */
const MENU_MOVE_THRESHOLD = 8;

interface Props {
  chordId: string;
  size: number;
  /** Kept as a seam for future use; no current caller sets this. */
  disabled?: boolean;
  board: BoardMetrics;
  ghost: GhostControls;
  onTap: () => void;
  onDrop: (col: number, row: number) => void;
  /** Called with the finger's screen position when a still hold opens the context menu. */
  onLongPressMenu?: (screenX: number, screenY: number) => void;
  /** The shape (this tile's whole magnet group) to show in the drag ghost. Defaults to just this tile. */
  getGroupShape?: () => { tiles: GhostTileSpec[]; cellSize: number };
}

/**
 * A chord tile that can be tapped (play sound), held and dragged (its whole
 * magnet group moves together), or held still to open a duplicate/delete
 * context menu. Requires a brief hold before the drag activates so it plays
 * nicely inside the palette's and board's scroll views.
 */
export function DraggableTile({
  chordId,
  size,
  disabled,
  board,
  ghost,
  onTap,
  onDrop,
  onLongPressMenu,
  getGroupShape,
}: Props) {
  const chord = getChord(chordId);
  const hiddenWhileDragging = useSharedValue(0);
  const totalMovement = useSharedValue(0);
  const dropSuppressed = useSharedValue(0);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveDrop = (relX: number, relY: number, boardWidth: number) => {
    const cellSize = boardWidth / BOARD_COLS;
    const cell = pointToCell(relX, relY, cellSize, BOARD_COLS);
    onDrop(cell.col, cell.row);
  };

  const startGhost = () => {
    const shape = getGroupShape
      ? getGroupShape()
      : { tiles: [{ chordId, dCol: 0, dRow: 0 }], cellSize: size };
    ghost.show(shape.tiles, shape.cellSize);
  };

  const clearMenuTimer = () => {
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
  };

  const armMenuTimer = (screenX: number, screenY: number) => {
    clearMenuTimer();
    menuTimerRef.current = setTimeout(() => {
      menuTimerRef.current = null;
      if (totalMovement.value < MENU_MOVE_THRESHOLD) {
        dropSuppressed.value = 1;
        ghost.opacity.value = 0;
        ghost.hide();
        onLongPressMenu?.(screenX, screenY);
      }
    }, MENU_HOLD_MS);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart((e) => {
      totalMovement.value = 0;
      dropSuppressed.value = 0;
      hiddenWhileDragging.value = 1;
      ghost.opacity.value = 1;
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
      runOnJS(startGhost)();
      runOnJS(armMenuTimer)(e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => {
      if (dropSuppressed.value) return;
      totalMovement.value = Math.hypot(e.translationX, e.translationY);
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
    })
    .onEnd((e) => {
      if (dropSuppressed.value) return;
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
      dropSuppressed.value = 0;
      runOnJS(clearMenuTimer)();
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
        <TileCard chord={chord} size={size} />
      </Animated.View>
    </GestureDetector>
  );
}
