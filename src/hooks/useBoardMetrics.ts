import { useRef } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

/**
 * Tracks the board container's window-space position/size (for drag drop-bounds
 * checks) and vertical scroll offset (so drops land on the right row while the
 * board is scrolled). x/y/width/height/scrollY are shared values so gesture
 * worklets can read them without crossing the JS bridge.
 */
export function useBoardMetrics(onSize?: (width: number, height: number) => void) {
  const ref = useRef<View>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const measure = () => {
    ref.current?.measureInWindow((mx, my, mw, mh) => {
      x.value = mx;
      y.value = my;
      width.value = mw;
      height.value = mh;
      onSize?.(mw, mh);
    });
  };

  return { ref, x, y, width, height, scrollY, measure };
}

export type BoardMetricsHandle = ReturnType<typeof useBoardMetrics>;
