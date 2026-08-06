import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Cell, groupShape, nearestFreeAnchor, nextFreeCellRightward, sequentialFreeCells } from '@/lib/grid';

/** Fixed number of tile columns on the freeform-grid dashboard. */
export const BOARD_COLS = 4;

export interface TileData {
  id: string;
  chordId: string;
  col: number;
  row: number;
}

/** A freeform grid board — tiles placed anywhere on a fixed-column grid. */
export interface GridBoard {
  id: string;
  name: string;
  type: 'grid';
  tiles: TileData[];
}

export interface TimeSignature {
  /** Beats per measure, e.g. 4 for 4/4 or 3/4. */
  beats: number;
  /** Note value that gets one beat, e.g. 4 for quarter notes. */
  unit: number;
}

export const TIME_SIGNATURE_PRESETS: TimeSignature[] = [
  { beats: 4, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 2, unit: 4 },
  { beats: 6, unit: 8 },
];

export interface Measure {
  id: string;
  /** Chords in this measure, in order. Usually one; more if the player added extras. */
  chordIds: string[];
}

export interface SheetLine {
  id: string;
  measures: Measure[];
}

/** A sheet-music-style board: numbered lines of bar-separated measures. */
export interface SheetBoard {
  id: string;
  name: string;
  type: 'sheet';
  timeSignature: TimeSignature;
  lines: SheetLine[];
}

export type BoardEntry = GridBoard | SheetBoard;

/** Measures a freshly-added line starts with. */
const DEFAULT_MEASURES_PER_LINE = 4;

interface BoardState {
  boards: BoardEntry[];
  activeBoardId: string;

  addTile: (chordId: string, target: Cell) => void;
  /** Add several chords in a straight line starting at `target`, wrapping rows as needed. */
  addTiles: (chordIds: string[], target: Cell) => void;
  /** Move a single tile, independent of any tiles it's adjacent to. */
  moveTile: (tileId: string, target: Cell) => void;
  /** Duplicate a single tile only (not its magnet group), placed just to its right. */
  duplicateTile: (tileId: string) => void;
  /** Duplicate the whole magnet group containing `tileId` as one unit. */
  duplicateGroup: (tileId: string) => void;
  /** Remove exactly the given tiles (no group expansion). */
  removeTiles: (tileIds: string[]) => void;
  /** Remove every tile connected to `tileId`. */
  removeGroup: (tileId: string) => void;
  /** Remove every tile on the active board. */
  clearBoard: () => void;

  /** Append a chord to the end of a measure's slot list. */
  addChordToMeasure: (lineId: string, measureId: string, chordId: string) => void;
  /** Drop a chord onto a line without picking a specific measure: fills the first empty measure, or adds a new one. */
  addChordToLine: (lineId: string, chordId: string) => void;
  /** Remove one chord slot from a measure by index. */
  removeChordFromMeasure: (lineId: string, measureId: string, index: number) => void;
  /** Append an empty measure to the end of a line. */
  addMeasure: (lineId: string) => void;
  /** Append a new empty line (with default measures) to the active sheet board. */
  addLine: () => void;
  /**
   * Move a line to the gap at `gapIndex` (0..line count, counted between/around
   * the *current* lines before this line is pulled out) — the reorder-mode
   * insertion-line UI.
   */
  moveLineTo: (lineId: string, gapIndex: number) => void;
  duplicateLine: (lineId: string) => void;
  deleteLine: (lineId: string) => void;

  createBoard: (name: string, type: 'grid') => void;
  createSheetBoard: (name: string, timeSignature: TimeSignature) => void;
  setActiveBoard: (boardId: string) => void;
  renameBoard: (boardId: string, name: string) => void;
  /** No-op if `boardId` is the only remaining board. */
  deleteBoard: (boardId: string) => void;
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function newMeasure(): Measure {
  return { id: newId('measure'), chordIds: [] };
}

function newLine(): SheetLine {
  return { id: newId('line'), measures: Array.from({ length: DEFAULT_MEASURES_PER_LINE }, newMeasure) };
}

const initialBoard: SheetBoard = {
  id: 'board-1',
  name: '보드 1',
  type: 'sheet',
  timeSignature: TIME_SIGNATURE_PRESETS[0],
  lines: [newLine()],
};

/** Applies `update` to the active board only if it's a grid board; otherwise a no-op. */
function updateActiveGridBoard(
  state: Pick<BoardState, 'boards' | 'activeBoardId'>,
  update: (board: GridBoard) => GridBoard
): BoardEntry[] {
  return state.boards.map((board) =>
    board.id === state.activeBoardId && board.type === 'grid' ? update(board) : board
  );
}

/** Applies `update` to the active board only if it's a sheet board; otherwise a no-op. */
function updateActiveSheetBoard(
  state: Pick<BoardState, 'boards' | 'activeBoardId'>,
  update: (board: SheetBoard) => SheetBoard
): BoardEntry[] {
  return state.boards.map((board) =>
    board.id === state.activeBoardId && board.type === 'sheet' ? update(board) : board
  );
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      boards: [initialBoard],
      activeBoardId: initialBoard.id,

      addTile: (chordId, target) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            const cell = nearestFreeAnchor(board.tiles, [{ col: 0, row: 0 }], target, BOARD_COLS);
            const tile: TileData = { id: newId('tile'), chordId, ...cell };
            return { ...board, tiles: [...board.tiles, tile] };
          }),
        })),

      addTiles: (chordIds, target) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            const cells = sequentialFreeCells(board.tiles, target, chordIds.length, BOARD_COLS);
            const newTiles: TileData[] = chordIds.map((chordId, i) => ({
              id: newId('tile'),
              chordId,
              ...cells[i],
            }));
            return { ...board, tiles: [...board.tiles, ...newTiles] };
          }),
        })),

      moveTile: (tileId, target) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            if (!board.tiles.some((tile) => tile.id === tileId)) return board;
            const cell = nearestFreeAnchor(board.tiles, [{ col: 0, row: 0 }], target, BOARD_COLS, new Set([tileId]));
            return {
              ...board,
              tiles: board.tiles.map((tile) => (tile.id === tileId ? { ...tile, ...cell } : tile)),
            };
          }),
        })),

      duplicateTile: (tileId) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            const origin = board.tiles.find((tile) => tile.id === tileId);
            if (!origin) return board;
            const cell = nextFreeCellRightward(board.tiles, { col: origin.col + 1, row: origin.row }, BOARD_COLS);
            const copy: TileData = { id: newId('tile'), chordId: origin.chordId, ...cell };
            return { ...board, tiles: [...board.tiles, copy] };
          }),
        })),

      duplicateGroup: (tileId) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            const shape = groupShape(board.tiles, tileId);
            if (!shape) return board;
            const byId = new Map(board.tiles.map((tile) => [tile.id, tile]));
            const origin = byId.get(tileId)!;
            const anchor = nearestFreeAnchor(board.tiles, [...shape.values()], origin, BOARD_COLS);
            const copies: TileData[] = [...shape].map(([id, offset]) => ({
              id: newId('tile'),
              chordId: byId.get(id)!.chordId,
              col: anchor.col + offset.col,
              row: anchor.row + offset.row,
            }));
            return { ...board, tiles: [...board.tiles, ...copies] };
          }),
        })),

      removeGroup: (tileId) =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => {
            const shape = groupShape(board.tiles, tileId);
            if (!shape) return board;
            const ids = new Set(shape.keys());
            return { ...board, tiles: board.tiles.filter((tile) => !ids.has(tile.id)) };
          }),
        })),

      removeTiles: (tileIds) =>
        set((state) => {
          const ids = new Set(tileIds);
          return {
            boards: updateActiveGridBoard(state, (board) => ({
              ...board,
              tiles: board.tiles.filter((tile) => !ids.has(tile.id)),
            })),
          };
        }),

      clearBoard: () =>
        set((state) => ({
          boards: updateActiveGridBoard(state, (board) => ({ ...board, tiles: [] })),
        })),

      addChordToMeasure: (lineId, measureId, chordId) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({
            ...board,
            lines: board.lines.map((line) =>
              line.id !== lineId
                ? line
                : {
                    ...line,
                    measures: line.measures.map((measure) =>
                      measure.id === measureId
                        ? { ...measure, chordIds: [...measure.chordIds, chordId] }
                        : measure
                    ),
                  }
            ),
          })),
        })),

      addChordToLine: (lineId, chordId) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({
            ...board,
            lines: board.lines.map((line) => {
              if (line.id !== lineId) return line;
              const emptyIndex = line.measures.findIndex((measure) => measure.chordIds.length === 0);
              if (emptyIndex >= 0) {
                const measures = [...line.measures];
                measures[emptyIndex] = { ...measures[emptyIndex], chordIds: [chordId] };
                return { ...line, measures };
              }
              return { ...line, measures: [...line.measures, { id: newId('measure'), chordIds: [chordId] }] };
            }),
          })),
        })),

      removeChordFromMeasure: (lineId, measureId, index) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({
            ...board,
            lines: board.lines.map((line) =>
              line.id !== lineId
                ? line
                : {
                    ...line,
                    measures: line.measures.map((measure) =>
                      measure.id === measureId
                        ? { ...measure, chordIds: measure.chordIds.filter((_, i) => i !== index) }
                        : measure
                    ),
                  }
            ),
          })),
        })),

      addMeasure: (lineId) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({
            ...board,
            lines: board.lines.map((line) =>
              line.id === lineId ? { ...line, measures: [...line.measures, newMeasure()] } : line
            ),
          })),
        })),

      addLine: () =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({ ...board, lines: [...board.lines, newLine()] })),
        })),

      moveLineTo: (lineId, gapIndex) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => {
            const fromIndex = board.lines.findIndex((line) => line.id === lineId);
            if (fromIndex < 0) return board;
            const gap = Math.max(0, Math.min(gapIndex, board.lines.length));
            // A gap at or right after the source's own slot is a no-op once the
            // source is removed, so only the gap position itself needs shifting.
            const insertAt = gap > fromIndex ? gap - 1 : gap;
            if (insertAt === fromIndex) return board;
            const lines = [...board.lines];
            const [moved] = lines.splice(fromIndex, 1);
            lines.splice(insertAt, 0, moved);
            return { ...board, lines };
          }),
        })),

      duplicateLine: (lineId) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => {
            const index = board.lines.findIndex((line) => line.id === lineId);
            if (index < 0) return board;
            const source = board.lines[index];
            const copy: SheetLine = {
              id: newId('line'),
              measures: source.measures.map((measure) => ({ id: newId('measure'), chordIds: [...measure.chordIds] })),
            };
            const lines = [...board.lines];
            lines.splice(index + 1, 0, copy);
            return { ...board, lines };
          }),
        })),

      deleteLine: (lineId) =>
        set((state) => ({
          boards: updateActiveSheetBoard(state, (board) => ({
            ...board,
            lines: board.lines.length <= 1 ? board.lines : board.lines.filter((line) => line.id !== lineId),
          })),
        })),

      createBoard: (name) =>
        set((state) => {
          const board: GridBoard = { id: newId('board'), name, type: 'grid', tiles: [] };
          return { boards: [...state.boards, board], activeBoardId: board.id };
        }),

      createSheetBoard: (name, timeSignature) =>
        set((state) => {
          const board: SheetBoard = {
            id: newId('board'),
            name,
            type: 'sheet',
            timeSignature,
            lines: [newLine()],
          };
          return { boards: [...state.boards, board], activeBoardId: board.id };
        }),

      setActiveBoard: (boardId) =>
        set((state) =>
          state.boards.some((board) => board.id === boardId) ? { activeBoardId: boardId } : state
        ),

      renameBoard: (boardId, name) =>
        set((state) => ({
          boards: state.boards.map((board) => (board.id === boardId ? { ...board, name } : board)),
        })),

      deleteBoard: (boardId) =>
        set((state) => {
          if (state.boards.length <= 1) return state;
          const boards = state.boards.filter((board) => board.id !== boardId);
          const activeBoardId =
            state.activeBoardId === boardId ? boards[0].id : state.activeBoardId;
          return { boards, activeBoardId };
        }),
    }),
    {
      name: 'uketile-boards',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ boards: state.boards, activeBoardId: state.activeBoardId }),
      // v1 boards predate the grid/sheet split and have no `type` field.
      migrate: (persisted) => {
        const state = persisted as { boards?: Array<Partial<BoardEntry>>; activeBoardId?: string };
        return {
          ...state,
          boards: (state.boards ?? []).map((board) =>
            board.type ? board : { ...board, type: 'grid', tiles: (board as GridBoard).tiles ?? [] }
          ),
        };
      },
    }
  )
);

export function useActiveBoard(): BoardEntry {
  return useBoardStore(
    (state) =>
      state.boards.find((board) => board.id === state.activeBoardId) ?? state.boards[0]
  );
}
