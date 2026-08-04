import { useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

export interface GhostTileSpec {
  chordId: string;
  /** Column/row offset from the dragged tile, in cells. */
  dCol: number;
  dRow: number;
}

interface GhostState {
  tiles: GhostTileSpec[];
  cellSize: number;
}

/**
 * Shared drag-ghost state for a whole magnet group: position/opacity live as
 * shared values (driven from gesture worklets), while which tiles/shape to
 * render is plain React state (set via `show`/`hide`, called through runOnJS).
 */
export function useGhostControls() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [state, setState] = useState<GhostState | null>(null);

  return {
    x,
    y,
    opacity,
    tiles: state?.tiles ?? [],
    cellSize: state?.cellSize ?? 0,
    show: (tiles: GhostTileSpec[], cellSize: number) => setState({ tiles, cellSize }),
    hide: () => setState(null),
  };
}

export type GhostControlsHandle = ReturnType<typeof useGhostControls>;
