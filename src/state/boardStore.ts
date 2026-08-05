import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Cell, groupShape, nearestFreeAnchor, nextFreeCellRightward, sequentialFreeCells } from '@/lib/grid';

/** Fixed number of tile columns on the dashboard grid. */
export const BOARD_COLS = 4;

export interface TileData {
  id: string;
  chordId: string;
  col: number;
  row: number;
}

export interface Board {
  id: string;
  name: string;
  tiles: TileData[];
}

interface BoardState {
  boards: Board[];
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
  createBoard: (name: string) => void;
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

const initialBoard: Board = { id: 'board-1', name: '보드 1', tiles: [] };

function updateActiveBoard(
  state: Pick<BoardState, 'boards' | 'activeBoardId'>,
  update: (board: Board) => Board
): Board[] {
  return state.boards.map((board) =>
    board.id === state.activeBoardId ? update(board) : board
  );
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      boards: [initialBoard],
      activeBoardId: initialBoard.id,

      addTile: (chordId, target) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
            const cell = nearestFreeAnchor(board.tiles, [{ col: 0, row: 0 }], target, BOARD_COLS);
            const tile: TileData = { id: newId('tile'), chordId, ...cell };
            return { ...board, tiles: [...board.tiles, tile] };
          }),
        })),

      addTiles: (chordIds, target) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
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
          boards: updateActiveBoard(state, (board) => {
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
          boards: updateActiveBoard(state, (board) => {
            const origin = board.tiles.find((tile) => tile.id === tileId);
            if (!origin) return board;
            const cell = nextFreeCellRightward(board.tiles, { col: origin.col + 1, row: origin.row }, BOARD_COLS);
            const copy: TileData = { id: newId('tile'), chordId: origin.chordId, ...cell };
            return { ...board, tiles: [...board.tiles, copy] };
          }),
        })),

      duplicateGroup: (tileId) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
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
          boards: updateActiveBoard(state, (board) => {
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
            boards: updateActiveBoard(state, (board) => ({
              ...board,
              tiles: board.tiles.filter((tile) => !ids.has(tile.id)),
            })),
          };
        }),

      clearBoard: () =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => ({ ...board, tiles: [] })),
        })),

      createBoard: (name) =>
        set((state) => {
          const board: Board = { id: newId('board'), name, tiles: [] };
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ boards: state.boards, activeBoardId: state.activeBoardId }),
    }
  )
);

export function useActiveBoard(): Board {
  return useBoardStore(
    (state) =>
      state.boards.find((board) => board.id === state.activeBoardId) ?? state.boards[0]
  );
}
