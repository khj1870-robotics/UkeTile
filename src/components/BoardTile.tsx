import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TileCard } from '@/components/TileCard';
import { Cell } from '@/lib/grid';
import { getChord } from '@/data/chords';

interface Props {
  chordId: string;
  size: number;
  /** Cell pitch in px, needed to translate drag distance into a column/row delta. */
  cellSize: number;
  col: number;
  row: number;
  onTap: () => void;
  onLongPressMenu: (screenX: number, screenY: number) => void;
  onMove: (target: Cell) => void;
}

const LONG_PRESS_MENU_MS = 450;

/**
 * A tile already placed on the board: tap to play its sound, press-and-drag
 * to move it, or hold still to open the duplicate/delete menu.
 *
 * The drop target is computed purely from `translationX/Y` (how far the
 * finger has moved since the gesture started) divided by the known cell
 * size — never from any window/absolute-position measurement. Earlier
 * drag implementations compared the finger's absolute screen position
 * against the board container's `measureInWindow` position, which turned
 * out to be unreliable on real Android devices (a well-known RN API
 * flakiness, not something specific to this app) and made dropping fail
 * outright. Relative cell-delta math has no such dependency.
 */
export function BoardTile({ chordId, size, cellSize, col, row, onTap, onLongPressMenu, onMove }: Props) {
  const chord = getChord(chordId);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const finishMove = (deltaCol: number, deltaRow: number) => {
    if (deltaCol === 0 && deltaRow === 0) return;
    onMove({ col: col + deltaCol, row: row + deltaRow });
  };

  // Requires a brief hold before activating so it plays nicely inside the
  // board's scroll view (a quick scroll swipe never holds still long enough
  // to trigger it). Kept as short as possible for a near-instant drag feel
  // while still leaving enough of a gate that a fast scroll flick doesn't
  // get misread as a tile grab.
  const pan = Gesture.Pan()
    .activateAfterLongPress(60)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const deltaCol = Math.round(e.translationX / cellSize);
      const deltaRow = Math.round(e.translationY / cellSize);
      runOnJS(finishMove)(deltaCol, deltaRow);
    })
    .onFinalize(() => {
      dragging.value = 0;
      translateX.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(0, { duration: 150 });
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  // A still hold (native maxDistance gate) opens the menu. Runs alongside
  // pan/tap without cancelling either.
  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MENU_MS)
    .onStart((e) => {
      runOnJS(onLongPressMenu)(e.absoluteX, e.absoluteY);
    });

  const gesture = Gesture.Simultaneous(Gesture.Exclusive(pan, tap), longPress);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex: dragging.value ? 10 : 0,
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
