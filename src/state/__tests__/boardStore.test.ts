import { act } from '@testing-library/react-native';

import { useBoardStore } from '@/state/boardStore';

function resetStore() {
  useBoardStore.setState({
    boards: [{ id: 'board-1', name: '보드 1', tiles: [] }],
    activeBoardId: 'board-1',
    selectedIds: [],
  });
}

beforeEach(() => {
  resetStore();
});

describe('boardStore', () => {
  it('adds a tile to the active board at the requested cell', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 1, row: 0 }));
    const board = useBoardStore.getState().boards[0];
    expect(board.tiles).toHaveLength(1);
    expect(board.tiles[0]).toMatchObject({ chordId: 'C', col: 1, row: 0 });
  });

  it('snaps a new tile to the nearest free cell if the target is occupied', () => {
    act(() => {
      useBoardStore.getState().addTile('C', { col: 0, row: 0 });
      useBoardStore.getState().addTile('G', { col: 0, row: 0 });
    });
    const tiles = useBoardStore.getState().boards[0].tiles;
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).not.toEqual(tiles[1]);
  });

  it('moves a tile to a new cell', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const tileId = useBoardStore.getState().boards[0].tiles[0].id;
    act(() => useBoardStore.getState().moveTile(tileId, { col: 2, row: 2 }));
    const tile = useBoardStore.getState().boards[0].tiles[0];
    expect(tile).toMatchObject({ col: 2, row: 2 });
  });

  it('removes tiles and clears them from the selection', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const tileId = useBoardStore.getState().boards[0].tiles[0].id;
    act(() => {
      useBoardStore.getState().toggleSelected(tileId);
      useBoardStore.getState().removeTiles([tileId]);
    });
    expect(useBoardStore.getState().boards[0].tiles).toHaveLength(0);
    expect(useBoardStore.getState().selectedIds).toHaveLength(0);
  });

  it('duplicates multiple selected tiles at once without collisions', () => {
    act(() => {
      useBoardStore.getState().addTile('C', { col: 0, row: 0 });
      useBoardStore.getState().addTile('G', { col: 1, row: 0 });
    });
    const originalIds = useBoardStore.getState().boards[0].tiles.map((t) => t.id);

    act(() => useBoardStore.getState().duplicateTiles(originalIds));

    const tiles = useBoardStore.getState().boards[0].tiles;
    expect(tiles).toHaveLength(4);
    const keys = tiles.map((t) => `${t.col},${t.row}`);
    expect(new Set(keys).size).toBe(4);
    const chordIds = tiles.map((t) => t.chordId).sort();
    expect(chordIds).toEqual(['C', 'C', 'G', 'G']);
  });

  it('toggles tile selection on and off', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const tileId = useBoardStore.getState().boards[0].tiles[0].id;
    act(() => useBoardStore.getState().toggleSelected(tileId));
    expect(useBoardStore.getState().selectedIds).toEqual([tileId]);
    act(() => useBoardStore.getState().toggleSelected(tileId));
    expect(useBoardStore.getState().selectedIds).toEqual([]);
  });

  it('creates a new board and makes it active', () => {
    act(() => useBoardStore.getState().createBoard('새 보드'));
    const state = useBoardStore.getState();
    expect(state.boards).toHaveLength(2);
    expect(state.activeBoardId).toBe(state.boards[1].id);
    expect(state.boards[1].name).toBe('새 보드');
  });
});
