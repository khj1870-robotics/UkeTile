import React from 'react';
import { GestureResponderEvent, Pressable } from 'react-native';

import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';

interface Props {
  chordId: string;
  size: number;
  onTap: () => void;
  onLongPressMenu: (screenX: number, screenY: number) => void;
}

const LONG_PRESS_MENU_MS = 450;

/** A tile already placed on the board: tap to play its sound, hold to open the duplicate/delete/move menu. */
export function BoardTile({ chordId, size, onTap, onLongPressMenu }: Props) {
  const chord = getChord(chordId);
  if (!chord) return null;

  const handleLongPress = (e: GestureResponderEvent) => {
    onLongPressMenu(e.nativeEvent.pageX, e.nativeEvent.pageY);
  };

  return (
    <Pressable onPress={onTap} onLongPress={handleLongPress} delayLongPress={LONG_PRESS_MENU_MS}>
      <TileCard chord={chord} size={size} />
    </Pressable>
  );
}
