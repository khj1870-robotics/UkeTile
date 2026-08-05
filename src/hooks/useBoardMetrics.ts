import { useRef } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

/**
 * Tracks the board container's vertical scroll offset (so drops land on the
 * right row while the board is scrolled) and exposes a ref used to measure
 * the container's window-space position/size fresh at the moment a drop
 * happens, rather than caching it from the first layout.
 *
 * Caching x/y/width/height from a single `measureInWindow` call made at
 * mount time used to cause drops to silently fail no matter where you
 * released a tile: Android can return a correct size but a stale/zero
 * window-position (and nothing else in the app depended on that cached
 * value, so a wrong one went unnoticed). Measuring again right before each
 * drop avoids relying on a value that can never self-correct.
 */
export function useBoardMetrics(onSize?: (width: number, height: number) => void) {
  const ref = useRef<View>(null);
  const scrollY = useSharedValue(0);

  const measure = () => {
    ref.current?.measureInWindow((_mx, _my, mw, mh) => {
      onSize?.(mw, mh);
    });
  };

  return { ref, scrollY, measure };
}

export type BoardMetricsHandle = ReturnType<typeof useBoardMetrics>;
