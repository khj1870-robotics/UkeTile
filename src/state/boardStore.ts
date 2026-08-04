import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Cell, duplicatePlacements, nearestFreeCell } from '@/lib/grid';

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
  /** Tile ids selected in multi-select mode (not persisted). */
  selectedIds: string[];

  addTile: (chordId: string, target: Cell) => void;
  moveTile: (tileId: string, target: Cell) => void;
  removeTiles: (tileIds: readonly string[]) => void;
  /** Duplicate all given tiles at once, each copy snapping next to its original. */
  duplicateTiles: (tileIds: readonly string[]) => void;
  toggleSelected: (tileId: string) => void;
  clearSelection: () => void;
  createBoard: (name: string) => void;
  setActiveBoard: (boardId: string) => void;
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
      selectedIds: [],

      addTile: (chordId, target) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
            const cell = nearestFreeCell(board.tiles, target, BOARD_COLS);
            const tile: TileData = { id: newId('tile'), chordId, ...cell };
            return { ...board, tiles: [...board.tiles, tile] };
          }),
        })),

      moveTile: (tileId, target) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
            const cell = nearestFreeCell(board.tiles, target, BOARD_COLS, new Set([tileId]));
            return {
              ...board,
              tiles: board.tiles.map((tile) =>
                tile.id === tileId ? { ...tile, ...cell } : tile
              ),
            };
          }),
        })),

      removeTiles: (tileIds) =>
        set((state) => {
          const remove = new Set(tileIds);
          return {
            boards: updateActiveBoard(state, (board) => ({
              ...board,
              tiles: board.tiles.filter((tile) => !remove.has(tile.id)),
            })),
            selectedIds: state.selectedIds.filter((id) => !remove.has(id)),
          };
        }),

      duplicateTiles: (tileIds) =>
        set((state) => ({
          boards: updateActiveBoard(state, (board) => {
            const placements = duplicatePlacements(board.tiles, tileIds, BOARD_COLS);
            const byId = new Map(board.tiles.map((tile) => [tile.id, tile]));
            const copies: TileData[] = [];
            for (const [originalId, cell] of placements) {
              const original = byId.get(originalId);
              if (!original) continue;
              copies.push({ id: newId('tile'), chordId: original.chordId, ...cell });
            }
            return { ...board, tiles: [...board.tiles, ...copies] };
          }),
        })),

      toggleSelected: (tileId) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(tileId)
            ? state.selectedIds.filter((id) => id !== tileId)
            : [...state.selectedIds, tileId],
        })),

      clearSelection: () => set({ selectedIds: [] }),

      createBoard: (name) =>
        set((state) => {
          const board: Board = { id: newId('board'), name, tiles: [] };
          return { boards: [...state.boards, board], activeBoardId: board.id, selectedIds: [] };
        }),

      setActiveBoard: (boardId) =>
        set((state) =>
          state.boards.some((board) => board.id === boardId)
            ? { activeBoardId: boardId, selectedIds: [] }
            : state
        ),
    }),
    {
      name: 'uketile-boards',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Selection is transient UI state; only boards survive restarts.
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
