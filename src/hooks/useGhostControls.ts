import { useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

interface GhostState {
  chordId: string;
  size: number;
}

/**
 * Shared drag-ghost state: position/opacity live as shared values (driven from
 * gesture worklets), while which chord/size to render is plain React state
 * (set via the `show`/`hide` callbacks, which worklets call through runOnJS).
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
    chordId: state?.chordId ?? null,
    size: state?.size ?? 0,
    show: (chordId: string, size: number) => setState({ chordId, size }),
    hide: () => setState(null),
  };
}

export type GhostControlsHandle = ReturnType<typeof useGhostControls>;
