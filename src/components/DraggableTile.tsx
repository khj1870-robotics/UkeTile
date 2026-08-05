import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';
import { GhostTileSpec } from '@/hooks/useGhostControls';
import { BOARD_COLS } from '@/state/boardStore';
import { pointToCell } from '@/lib/grid';

/**
 * Board container ref (measured fresh at drop time, not cached) + vertical
 * scroll offset, read by drag worklets/callbacks.
 */
export interface BoardMetrics {
  ref: React.RefObject<View | null>;
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

/** How long (ms) a still hold takes before it opens the duplicate/delete menu. */
const LONG_PRESS_MENU_MS = 450;

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
 * context menu.
 *
 * The drag (`pan`) and the menu (`longPress`) are deliberately independent,
 * simultaneous gestures rather than one gesture that branches based on
 * timing/movement heuristics — an earlier version tried to have `pan` itself
 * decide "is this actually a still hold?" and suppress the drop if so, which
 * turned out to misfire on real devices and broke dropping entirely. Now
 * `pan`'s drop logic never depends on anything long-press-related.
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

  // Measured fresh at the moment of drop rather than reading a value cached
  // at mount — a cached window-position from the first layout pass can be
  // wrong (a known Android quirk) and, since nothing else depended on it,
  // would silently make every drop miss forever with no visible symptom
  // other than "it never lands."
  const resolveDrop = (absoluteX: number, absoluteY: number, scrollY: number) => {
    board.ref.current?.measureInWindow((bx, by, bw, bh) => {
      const withinX = absoluteX >= bx && absoluteX <= bx + bw;
      const withinY = absoluteY >= by && absoluteY <= by + bh;
      if (!withinX || !withinY) return;
      const relX = absoluteX - bx;
      const relY = absoluteY - by + scrollY;
      const cellSize = bw / BOARD_COLS;
      const cell = pointToCell(relX, relY, cellSize, BOARD_COLS);
      onDrop(cell.col, cell.row);
    });
  };

  const startGhost = () => {
    const shape = getGroupShape
      ? getGroupShape()
      : { tiles: [{ chordId, dCol: 0, dRow: 0 }], cellSize: size };
    ghost.show(shape.tiles, shape.cellSize);
  };

  // Requires a brief hold before activating so it plays nicely inside the
  // palette's and board's scroll views (a quick scroll swipe never holds
  // still long enough to trigger it). Once activated, behaves exactly like a
  // plain pan: it always attempts a drop on release.
  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart((e) => {
      hiddenWhileDragging.value = 1;
      ghost.opacity.value = 1;
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
      runOnJS(startGhost)();
    })
    .onUpdate((e) => {
      ghost.x.value = e.absoluteX - size / 2;
      ghost.y.value = e.absoluteY - size / 2;
    })
    .onEnd((e) => {
      runOnJS(resolveDrop)(e.absoluteX, e.absoluteY, board.scrollY.value);
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

  // A still hold (native maxDistance gate, not a hand-rolled timer) opens the
  // menu. Runs alongside `pan`/`tap` without cancelling either.
  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MENU_MS)
    .onStart((e) => {
      if (onLongPressMenu) {
        runOnJS(onLongPressMenu)(e.absoluteX, e.absoluteY);
      }
    });

  const dragOrTap = Gesture.Exclusive(pan, tap);
  const gesture = disabled ? tap : Gesture.Simultaneous(dragOrTap, longPress);

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
