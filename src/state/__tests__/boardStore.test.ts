import { act } from '@testing-library/react-native';

import { useBoardStore } from '@/state/boardStore';

function resetStore() {
  useBoardStore.setState({
    boards: [{ id: 'board-1', name: '보드 1', tiles: [] }],
    activeBoardId: 'board-1',
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

  it('moveTile moves a single tile to the requested cell', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const tileId = useBoardStore.getState().boards[0].tiles[0].id;
    act(() => useBoardStore.getState().moveTile(tileId, { col: 2, row: 2 }));
    const tile = useBoardStore.getState().boards[0].tiles[0];
    expect(tile).toMatchObject({ col: 2, row: 2 });
  });

  it('moveTile moves only the given tile, leaving adjacent tiles untouched', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 1, row: 0 },
            { id: 'c', chordId: 'Am', col: 3, row: 3 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().moveTile('a', { col: 2, row: 2 }));

    const tiles = useBoardStore.getState().boards[0].tiles;
    const byId = new Map(tiles.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ col: 2, row: 2 });
    expect(byId.get('b')).toMatchObject({ col: 1, row: 0 });
    expect(byId.get('c')).toMatchObject({ col: 3, row: 3 });
  });

  it('moveTile snaps to the nearest free cell if the target is occupied', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 2, row: 2 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().moveTile('a', { col: 2, row: 2 }));

    const tiles = useBoardStore.getState().boards[0].tiles;
    const byId = new Map(tiles.map((t) => [t.id, t]));
    expect(byId.get('a')).not.toMatchObject({ col: 2, row: 2 });
    expect(byId.get('b')).toMatchObject({ col: 2, row: 2 });
  });

  it('moveTile on an unknown tile id is a no-op', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const before = useBoardStore.getState().boards[0].tiles;
    act(() => useBoardStore.getState().moveTile('missing', { col: 2, row: 2 }));
    expect(useBoardStore.getState().boards[0].tiles).toEqual(before);
  });

  it('duplicateGroup duplicates a connected L-shape as one unit with no overlaps', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 0, row: 1 },
            { id: 'c', chordId: 'Am', col: 1, row: 1 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().duplicateGroup('a'));

    const tiles = useBoardStore.getState().boards[0].tiles;
    expect(tiles).toHaveLength(6);
    const keys = tiles.map((t) => `${t.col},${t.row}`);
    expect(new Set(keys).size).toBe(6);

    const originals = tiles.filter((t) => ['a', 'b', 'c'].includes(t.id));
    const copies = tiles.filter((t) => !['a', 'b', 'c'].includes(t.id));
    expect(copies).toHaveLength(3);
    const copyChords = copies.map((t) => t.chordId).sort();
    expect(copyChords).toEqual(['Am', 'C', 'G']);

    const copyByChord = new Map(copies.map((t) => [t.chordId, t]));
    const originByChord = new Map(originals.map((t) => [t.chordId, t]));
    const relOf = (t: { col: number; row: number }, origin: { col: number; row: number }) => ({
      col: t.col - origin.col,
      row: t.row - origin.row,
    });
    const copyOrigin = copyByChord.get('C')!;
    const originOrigin = originByChord.get('C')!;
    for (const chord of ['C', 'G', 'Am']) {
      expect(relOf(copyByChord.get(chord)!, copyOrigin)).toEqual(relOf(originByChord.get(chord)!, originOrigin));
    }
  });

  it('duplicateGroup on an unknown tile id is a no-op', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const before = useBoardStore.getState().boards[0].tiles;
    act(() => useBoardStore.getState().duplicateGroup('missing'));
    expect(useBoardStore.getState().boards[0].tiles).toEqual(before);
  });

  it('removeGroup removes every connected member and leaves other groups intact', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 1, row: 0 },
            { id: 'c', chordId: 'Am', col: 5, row: 5 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().removeGroup('a'));

    const tiles = useBoardStore.getState().boards[0].tiles;
    expect(tiles.map((t) => t.id)).toEqual(['c']);
  });

  it('removeGroup on an unknown tile id is a no-op', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const before = useBoardStore.getState().boards[0].tiles;
    act(() => useBoardStore.getState().removeGroup('missing'));
    expect(useBoardStore.getState().boards[0].tiles).toEqual(before);
  });

  it('creates a new board and makes it active', () => {
    act(() => useBoardStore.getState().createBoard('새 보드'));
    const state = useBoardStore.getState();
    expect(state.boards).toHaveLength(2);
    expect(state.activeBoardId).toBe(state.boards[1].id);
    expect(state.boards[1].name).toBe('새 보드');
  });

  it('renames a board', () => {
    const boardId = useBoardStore.getState().boards[0].id;
    act(() => useBoardStore.getState().renameBoard(boardId, '연습곡'));
    expect(useBoardStore.getState().boards[0].name).toBe('연습곡');
  });

  it('deletes a board and falls back the active board if it was deleted', () => {
    act(() => useBoardStore.getState().createBoard('두번째 보드'));
    const state = useBoardStore.getState();
    const firstId = state.boards[0].id;
    const secondId = state.boards[1].id;
    expect(state.activeBoardId).toBe(secondId);

    act(() => useBoardStore.getState().deleteBoard(secondId));

    const after = useBoardStore.getState();
    expect(after.boards.map((b) => b.id)).toEqual([firstId]);
    expect(after.activeBoardId).toBe(firstId);
  });

  it('refuses to delete the only remaining board', () => {
    const boardId = useBoardStore.getState().boards[0].id;
    act(() => useBoardStore.getState().deleteBoard(boardId));
    expect(useBoardStore.getState().boards).toHaveLength(1);
  });
});
