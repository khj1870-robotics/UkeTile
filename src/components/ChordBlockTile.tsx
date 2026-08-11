import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { ChordDiagram } from '@/components/ChordDiagram';
import { getChord } from '@/data/chords';
import { ChordBlock, SLOTS_PER_MEASURE } from '@/data/song';
import { patternArrows, resolvePattern, StrokeId, StrokePattern } from '@/data/strokePatterns';
import { useSongStore } from '@/state/songStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, paletteForRootPc, radii } from '@/theme';

const HANDLE_WIDTH = 16;

interface Props {
  songId: string;
  block: ChordBlock;
  measureIndex: number;
  measureCount: number;
  defaultStrokeId: StrokeId;
  measureWidth: number;
  measureHeight: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A chord block on the timing grid (§16): name, mini diagram, stroke arrows.
 * The main body drags (long-press) to move within/between measures; the
 * right-edge handle drags to resize. Both only ever use relative gesture
 * translation divided by the (known, constant) slot width — never an
 * absolute cross-component position — because this repo's history shows
 * that's what actually stays reliable on real devices (see plan notes).
 */
export function ChordBlockTile({
  songId,
  block,
  measureIndex,
  measureCount,
  defaultStrokeId,
  measureWidth,
  measureHeight,
  selected,
  onSelect,
}: Props) {
  const moveChordBlock = useSongStore((s) => s.moveChordBlock);
  const resizeChordBlock = useSongStore((s) => s.resizeChordBlock);
  const leftHanded = useSettingsStore((s) => s.leftHanded);

  const chord = getChord(block.chordId);
  const cellWidth = measureWidth / SLOTS_PER_MEASURE;
  const left = block.startSlot * cellWidth;
  const width = block.lengthSlots * cellWidth;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const resizeDelta = useSharedValue(0);
  const resizing = useSharedValue(0);

  if (!chord) return null;
  const palette = paletteForRootPc(chord.rootPc);
  const pattern: StrokePattern = resolvePattern(block.strokeId ?? defaultStrokeId, block.customPattern);
  const arrows = patternArrows(pattern, { start: block.startSlot, length: block.lengthSlots });

  const finishMove = (dxPx: number, dyPx: number) => {
    const deltaSlots = Math.round(dxPx / cellWidth);
    const deltaMeasures = Math.round(dyPx / measureHeight);
    if (deltaSlots === 0 && deltaMeasures === 0) return;
    const targetMeasure = Math.max(0, Math.min(measureCount - 1, measureIndex + deltaMeasures));
    moveChordBlock(songId, block.id, targetMeasure, block.startSlot + deltaSlots);
  };

  const finishResize = (dxPx: number) => {
    const deltaSlots = Math.round(dxPx / cellWidth);
    if (deltaSlots === 0) return;
    resizeChordBlock(songId, block.id, block.lengthSlots + deltaSlots);
  };

  const movePan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(finishMove)(e.translationX, e.translationY);
    })
    .onFinalize(() => {
      dragging.value = 0;
      translateX.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(0, { duration: 150 });
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  const bodyGesture = Gesture.Exclusive(movePan, tap);

  const resizePan = Gesture.Pan()
    .onStart(() => {
      resizing.value = 1;
    })
    .onUpdate((e) => {
      resizeDelta.value = e.translationX;
    })
    .onEnd((e) => {
      runOnJS(finishResize)(e.translationX);
    })
    .onFinalize(() => {
      resizing.value = 0;
      resizeDelta.value = withTiming(0, { duration: 150 });
    });

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex: dragging.value ? 10 : selected ? 5 : 1,
  }));

  const widthStyle = useAnimatedStyle(() => ({
    width: Math.max(cellWidth, width + resizeDelta.value),
  }));

  return (
    <Animated.View style={[styles.container, { left, top: 0, height: measureHeight }, widthStyle, bodyStyle]}>
      <GestureDetector gesture={bodyGesture}>
        <View
          style={[
            styles.body,
            {
              backgroundColor: palette.bg,
              borderColor: selected ? colors.accent : palette.border,
              borderWidth: selected ? 2.5 : 1.5,
            },
          ]}
        >
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {chord.name}
          </Text>
          <ChordDiagram chord={chord} width={Math.min(64, width * 0.5)} mirrored={leftHanded} dotColor={palette.accent} />
          <Text style={styles.arrows} numberOfLines={1}>
            {arrows || ' '}
          </Text>
        </View>
      </GestureDetector>
      <GestureDetector gesture={resizePan}>
        <View style={styles.handle}>
          <View style={styles.handleGrip} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  body: {
    flex: 1,
    marginRight: HANDLE_WIDTH,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 1,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  arrows: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  handle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleGrip: {
    width: 4,
    height: '55%',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
