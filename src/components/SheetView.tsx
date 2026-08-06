import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { LineContextMenu } from '@/components/LineContextMenu';
import { TileCard } from '@/components/TileCard';
import { getChord } from '@/data/chords';
import { SheetBoard, SheetLine } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

export const SHEET_TILE_SIZE = 84;
const STAFF_LINE_COUNT = 5;
const LONG_PRESS_MENU_MS = 450;

/**
 * Screen bounds of the sheet container plus each line's vertical span within
 * the scrolling content, kept fresh via passive layout/scroll events (never
 * an imperative measure call) so a palette drag can hit-test which line it
 * was dropped on.
 */
export interface SheetLayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollY: number;
  lineBounds: Map<string, { y: number; height: number }>;
}

interface Props {
  board: SheetBoard;
  hasArmed: boolean;
  onMeasureTap: (lineId: string, measureId: string) => void;
  onChordTap: (chordId: string) => void;
  onRemoveChord: (lineId: string, measureId: string, index: number) => void;
  onAddMeasure: (lineId: string) => void;
  onDuplicateLine: (lineId: string) => void;
  onDeleteLine: (lineId: string) => void;
  onMoveLineTo: (lineId: string, gapIndex: number) => void;
  onAddLine: () => void;
  /** Written on layout/scroll for the palette's drag-drop hit test; read only at drop time. */
  layoutRef?: React.MutableRefObject<SheetLayoutRect>;
}

/** Faint 5-line staff drawn behind a line's content, purely decorative. */
function StaffBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: STAFF_LINE_COUNT }, (_, i) => (
        <View key={i} style={[styles.staffLine, { top: `${((i + 1) / (STAFF_LINE_COUNT + 1)) * 100}%` }]} />
      ))}
    </View>
  );
}

/** A thin insertion point tappable in reorder mode; N+1 of these surround N lines. */
function InsertionGap({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.insertionGap} onPress={onPress} hitSlop={{ top: 10, bottom: 10 }}>
      <View style={styles.insertionLine} />
    </Pressable>
  );
}

/**
 * One numbered sheet line. Chords render as full tiles (with fingering
 * diagrams) in a wrapping row, bar boundaries are plain divider lines between
 * tiles (not boxes around them), and a faint staff sits behind everything.
 */
function LineRow({
  line,
  index,
  hasArmed,
  dimmed,
  onMeasureTap,
  onChordTap,
  onRemoveChord,
  onOpenMenu,
  onLayoutLine,
}: {
  line: SheetLine;
  index: number;
  hasArmed: boolean;
  dimmed: boolean;
  onMeasureTap: (measureId: string) => void;
  onChordTap: (chordId: string) => void;
  onRemoveChord: (measureId: string, chordIndex: number) => void;
  onOpenMenu: (x: number, y: number) => void;
  onLayoutLine: (y: number, height: number) => void;
}) {
  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MENU_MS)
    .onStart((e) => {
      runOnJS(onOpenMenu)(e.absoluteX, e.absoluteY);
    });

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayoutLine(e.nativeEvent.layout.y, e.nativeEvent.layout.height);
  };

  return (
    <View
      style={[styles.lineRow, dimmed && styles.lineRowDimmed]}
      pointerEvents={dimmed ? 'none' : 'auto'}
      onLayout={handleLayout}
    >
      <GestureDetector gesture={longPress}>
        <View style={styles.lineNumberWrap}>
          <Text style={styles.lineNumber}>{index + 1}</Text>
        </View>
      </GestureDetector>

      <View style={styles.lineBody}>
        <StaffBackground />
        <View style={styles.measureRow}>
          {line.measures.map((measure, mi) => (
            <React.Fragment key={measure.id}>
              {mi > 0 && <View style={styles.barLine} />}
              <Pressable style={styles.measureGroup} onPress={() => onMeasureTap(measure.id)}>
                {measure.chordIds.length === 0 ? (
                  <View style={[styles.emptyMeasure, hasArmed && styles.emptyMeasureActive]}>
                    <Text style={styles.emptyMeasureText}>+</Text>
                  </View>
                ) : (
                  measure.chordIds.map((chordId, i) => {
                    const chord = getChord(chordId);
                    if (!chord) return null;
                    return (
                      <View key={`${chordId}-${i}`} style={styles.chordSlot}>
                        <Pressable onPress={() => onChordTap(chordId)}>
                          <TileCard chord={chord} size={SHEET_TILE_SIZE} />
                        </Pressable>
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => onRemoveChord(measure.id, i)}
                          hitSlop={8}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Sheet-music-style board: numbered lines of bar-separated measures. A
 * measure normally holds one chord; tapping it while a chord is armed
 * appends another slot, so mid-measure chord changes are just extra taps.
 * Long-pressing a line number opens duplicate/delete/reorder controls.
 */
export function SheetView({
  board,
  hasArmed,
  onMeasureTap,
  onChordTap,
  onRemoveChord,
  onAddMeasure,
  onDuplicateLine,
  onDeleteLine,
  onMoveLineTo,
  onAddLine,
  layoutRef,
}: Props) {
  const [menu, setMenu] = useState<{ lineId: string; x: number; y: number } | null>(null);
  const [reorderingLineId, setReorderingLineId] = useState<string | null>(null);
  const fallbackRef = useRef<SheetLayoutRect>({ x: 0, y: 0, width: 0, height: 0, scrollY: 0, lineBounds: new Map() });
  const rectRef = layoutRef ?? fallbackRef;

  const closeMenu = () => setMenu(null);
  const cancelReorder = () => setReorderingLineId(null);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    rectRef.current = { ...rectRef.current, x, y, width, height };
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    rectRef.current = { ...rectRef.current, scrollY: e.nativeEvent.contentOffset.y };
  };

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <ScrollView contentContainerStyle={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
        {reorderingLineId && <InsertionGap onPress={() => { onMoveLineTo(reorderingLineId, 0); cancelReorder(); }} />}
        {board.lines.map((line, index) => (
          <React.Fragment key={line.id}>
            <LineRow
              line={line}
              index={index}
              hasArmed={hasArmed}
              dimmed={reorderingLineId !== null}
              onMeasureTap={(measureId) => onMeasureTap(line.id, measureId)}
              onChordTap={onChordTap}
              onRemoveChord={(measureId, i) => onRemoveChord(line.id, measureId, i)}
              onOpenMenu={(x, y) => setMenu({ lineId: line.id, x, y })}
              onLayoutLine={(y, height) => rectRef.current.lineBounds.set(line.id, { y, height })}
            />
            {reorderingLineId && (
              <InsertionGap
                onPress={() => {
                  onMoveLineTo(reorderingLineId, index + 1);
                  cancelReorder();
                }}
              />
            )}
            {!reorderingLineId && (
              <Pressable style={styles.addMeasure} onPress={() => onAddMeasure(line.id)}>
                <Text style={styles.addMeasureText}>+마디</Text>
              </Pressable>
            )}
          </React.Fragment>
        ))}
        {!reorderingLineId && (
          <Pressable style={styles.addLine} onPress={onAddLine}>
            <Text style={styles.addLineText}>+ 줄 추가</Text>
          </Pressable>
        )}
      </ScrollView>

      {menu && (
        <LineContextMenu
          x={menu.x}
          y={menu.y}
          canDelete={board.lines.length > 1}
          onDuplicate={() => {
            onDuplicateLine(menu.lineId);
            closeMenu();
          }}
          onDelete={() => {
            onDeleteLine(menu.lineId);
            closeMenu();
          }}
          onReorder={() => {
            setReorderingLineId(menu.lineId);
            closeMenu();
          }}
          onDismiss={closeMenu}
        />
      )}

      {reorderingLineId && (
        <View style={styles.reorderBanner} pointerEvents="box-none">
          <Text style={styles.reorderBannerText}>이동할 위치를 탭하세요</Text>
          <Pressable onPress={cancelReorder}>
            <Text style={styles.reorderCancelText}>취소</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  lineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lineRowDimmed: { opacity: 0.35 },
  lineNumberWrap: {
    width: 28,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  lineNumber: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  lineBody: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  staffLine: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    height: 1,
    backgroundColor: colors.textDim,
    opacity: 0.15,
  },
  measureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  measureGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  barLine: {
    width: 2,
    height: SHEET_TILE_SIZE,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  emptyMeasure: {
    width: SHEET_TILE_SIZE,
    height: SHEET_TILE_SIZE,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMeasureActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(244, 162, 89, 0.12)',
  },
  emptyMeasureText: { color: colors.border, fontSize: 20, fontWeight: '800' },
  chordSlot: { position: 'relative' },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: { color: colors.textDim, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  addMeasure: {
    marginLeft: 28 + spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    alignSelf: 'flex-start',
  },
  addMeasureText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  addLine: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  addLineText: { color: colors.textDim, fontWeight: '800' },
  reorderBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reorderBannerText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  reorderCancelText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  insertionGap: {
    paddingVertical: spacing.xs,
    marginLeft: 28 + spacing.sm,
  },
  insertionLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
