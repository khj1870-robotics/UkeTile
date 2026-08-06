import { act } from '@testing-library/react-native';

import { useBoardStore } from '@/state/boardStore';

function resetStore() {
  useBoardStore.setState({
    boards: [{ id: 'board-1', name: '보드 1', type: 'grid', tiles: [] }],
    activeBoardId: 'board-1',
  });
}

/** Reads the active board's tiles, asserting it's a grid board (all tests here use one). */
function gridTiles() {
  const board = useBoardStore.getState().boards[0];
  if (board.type !== 'grid') throw new Error('expected a grid board');
  return board.tiles;
}

beforeEach(() => {
  resetStore();
});

describe('boardStore', () => {
  it('adds a tile to the active board at the requested cell', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 1, row: 0 }));
    const tiles = gridTiles();
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toMatchObject({ chordId: 'C', col: 1, row: 0 });
  });

  it('snaps a new tile to the nearest free cell if the target is occupied', () => {
    act(() => {
      useBoardStore.getState().addTile('C', { col: 0, row: 0 });
      useBoardStore.getState().addTile('G', { col: 0, row: 0 });
    });
    const tiles = gridTiles();
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).not.toEqual(tiles[1]);
  });

  it('addTiles lines up several chords in a row starting at the target', () => {
    act(() => useBoardStore.getState().addTiles(['C', 'G', 'Am'], { col: 0, row: 0 }));
    const tiles = gridTiles();
    expect(tiles).toHaveLength(3);
    const byChord = new Map(tiles.map((t) => [t.chordId, t]));
    expect(byChord.get('C')).toMatchObject({ col: 0, row: 0 });
    expect(byChord.get('G')).toMatchObject({ col: 1, row: 0 });
    expect(byChord.get('Am')).toMatchObject({ col: 2, row: 0 });
  });

  it('addTiles skips already-occupied cells while lining up', () => {
    act(() => {
      useBoardStore.getState().addTile('C', { col: 1, row: 0 });
      useBoardStore.getState().addTiles(['G', 'Am'], { col: 0, row: 0 });
    });
    const tiles = gridTiles();
    const byChord = new Map(tiles.map((t) => [t.chordId, t]));
    expect(byChord.get('G')).toMatchObject({ col: 0, row: 0 });
    expect(byChord.get('Am')).toMatchObject({ col: 2, row: 0 });
  });

  it('duplicateTile copies only the single tile, placed to its right', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 0, row: 1 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().duplicateTile('a'));

    const tiles = gridTiles();
    expect(tiles).toHaveLength(3);
    const copy = tiles.find((t) => !['a', 'b'].includes(t.id))!;
    expect(copy).toMatchObject({ chordId: 'C', col: 1, row: 0 });
    // The unrelated tile ('b') is untouched — no group expansion.
    expect(tiles.find((t) => t.id === 'b')).toMatchObject({ col: 0, row: 1 });
  });

  it('duplicateTile skips rightward past an occupied cell', () => {
    act(() => {
      useBoardStore.setState((state) => ({
        boards: state.boards.map((b) => ({
          ...b,
          tiles: [
            { id: 'a', chordId: 'C', col: 0, row: 0 },
            { id: 'b', chordId: 'G', col: 1, row: 0 },
          ],
        })),
      }));
    });

    act(() => useBoardStore.getState().duplicateTile('a'));

    const tiles = gridTiles();
    const copy = tiles.find((t) => !['a', 'b'].includes(t.id))!;
    expect(copy).toMatchObject({ chordId: 'C', col: 2, row: 0 });
  });

  it('removeTiles removes exactly the given ids, no group expansion', () => {
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

    act(() => useBoardStore.getState().removeTiles(['a']));

    const tiles = gridTiles();
    expect(tiles.map((t) => t.id).sort()).toEqual(['b', 'c']);
  });

  it('clearBoard removes every tile on the active board', () => {
    act(() => {
      useBoardStore.getState().addTile('C', { col: 0, row: 0 });
      useBoardStore.getState().addTile('G', { col: 1, row: 0 });
    });
    act(() => useBoardStore.getState().clearBoard());
    expect(gridTiles()).toEqual([]);
  });

  it('moveTile moves a single tile to the requested cell', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const tileId = gridTiles()[0].id;
    act(() => useBoardStore.getState().moveTile(tileId, { col: 2, row: 2 }));
    const tile = gridTiles()[0];
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

    const tiles = gridTiles();
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

    const tiles = gridTiles();
    const byId = new Map(tiles.map((t) => [t.id, t]));
    expect(byId.get('a')).not.toMatchObject({ col: 2, row: 2 });
    expect(byId.get('b')).toMatchObject({ col: 2, row: 2 });
  });

  it('moveTile on an unknown tile id is a no-op', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const before = gridTiles();
    act(() => useBoardStore.getState().moveTile('missing', { col: 2, row: 2 }));
    expect(gridTiles()).toEqual(before);
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

    const tiles = gridTiles();
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
    const before = gridTiles();
    act(() => useBoardStore.getState().duplicateGroup('missing'));
    expect(gridTiles()).toEqual(before);
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

    const tiles = gridTiles();
    expect(tiles.map((t) => t.id)).toEqual(['c']);
  });

  it('removeGroup on an unknown tile id is a no-op', () => {
    act(() => useBoardStore.getState().addTile('C', { col: 0, row: 0 }));
    const before = gridTiles();
    act(() => useBoardStore.getState().removeGroup('missing'));
    expect(gridTiles()).toEqual(before);
  });

  it('creates a new board and makes it active', () => {
    act(() => useBoardStore.getState().createBoard('새 보드', 'grid'));
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
    act(() => useBoardStore.getState().createBoard('두번째 보드', 'grid'));
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

/** Reads the active board's lines, asserting it's a sheet board. */
function sheetLines() {
  const board = useBoardStore.getState().boards[useBoardStore.getState().boards.length - 1];
  if (board.type !== 'sheet') throw new Error('expected a sheet board');
  return board.lines;
}

describe('sheet boards', () => {
  beforeEach(() => {
    act(() => useBoardStore.getState().createSheetBoard('악보', { beats: 4, unit: 4 }));
  });

  it('creates a sheet board with one line of default measures', () => {
    const lines = sheetLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].measures.length).toBeGreaterThan(0);
    for (const measure of lines[0].measures) {
      expect(measure.chordIds).toEqual([]);
    }
  });

  it('appends chords to a measure in order', () => {
    const line = sheetLines()[0];
    const measureId = line.measures[0].id;
    act(() => {
      useBoardStore.getState().addChordToMeasure(line.id, measureId, 'C');
      useBoardStore.getState().addChordToMeasure(line.id, measureId, 'G');
    });
    expect(sheetLines()[0].measures[0].chordIds).toEqual(['C', 'G']);
  });

  it('removes a chord from a measure by index', () => {
    const line = sheetLines()[0];
    const measureId = line.measures[0].id;
    act(() => {
      useBoardStore.getState().addChordToMeasure(line.id, measureId, 'C');
      useBoardStore.getState().addChordToMeasure(line.id, measureId, 'G');
      useBoardStore.getState().removeChordFromMeasure(line.id, measureId, 0);
    });
    expect(sheetLines()[0].measures[0].chordIds).toEqual(['G']);
  });

  it('adds a measure to the end of a line', () => {
    const line = sheetLines()[0];
    const before = line.measures.length;
    act(() => useBoardStore.getState().addMeasure(line.id));
    expect(sheetLines()[0].measures.length).toBe(before + 1);
  });

  it('adds a new line', () => {
    act(() => useBoardStore.getState().addLine());
    expect(sheetLines()).toHaveLength(2);
  });

  it('moves a line to a later gap', () => {
    act(() => useBoardStore.getState().addLine());
    act(() => useBoardStore.getState().addLine());
    const [firstId, secondId, thirdId] = sheetLines().map((l) => l.id);
    // gap 3 = past the end of the 3-line list
    act(() => useBoardStore.getState().moveLineTo(firstId, 3));
    expect(sheetLines().map((l) => l.id)).toEqual([secondId, thirdId, firstId]);
  });

  it('moves a line to an earlier gap', () => {
    act(() => useBoardStore.getState().addLine());
    act(() => useBoardStore.getState().addLine());
    const [firstId, secondId, thirdId] = sheetLines().map((l) => l.id);
    act(() => useBoardStore.getState().moveLineTo(thirdId, 0));
    expect(sheetLines().map((l) => l.id)).toEqual([thirdId, firstId, secondId]);
  });

  it('is a no-op when the gap is adjacent to the line itself', () => {
    act(() => useBoardStore.getState().addLine());
    const [firstId, secondId] = sheetLines().map((l) => l.id);
    act(() => useBoardStore.getState().moveLineTo(firstId, 0));
    expect(sheetLines().map((l) => l.id)).toEqual([firstId, secondId]);
    act(() => useBoardStore.getState().moveLineTo(firstId, 1));
    expect(sheetLines().map((l) => l.id)).toEqual([firstId, secondId]);
  });

  it('is a no-op for an unknown line id', () => {
    const before = sheetLines().map((l) => l.id);
    act(() => useBoardStore.getState().moveLineTo('nope', 0));
    expect(sheetLines().map((l) => l.id)).toEqual(before);
  });

  it('drops a chord onto a line, filling the first empty measure', () => {
    const line = sheetLines()[0];
    act(() => useBoardStore.getState().addChordToLine(line.id, 'C'));
    expect(sheetLines()[0].measures[0].chordIds).toEqual(['C']);
  });

  it('adds a new measure when every measure in the line already has a chord', () => {
    const line = sheetLines()[0];
    act(() => {
      for (const measure of line.measures) {
        useBoardStore.getState().addChordToMeasure(line.id, measure.id, 'C');
      }
    });
    const before = sheetLines()[0].measures.length;
    act(() => useBoardStore.getState().addChordToLine(line.id, 'G'));
    const measures = sheetLines()[0].measures;
    expect(measures.length).toBe(before + 1);
    expect(measures[measures.length - 1].chordIds).toEqual(['G']);
  });

  it('duplicates a line with its chords, right after the original', () => {
    const line = sheetLines()[0];
    act(() => useBoardStore.getState().addChordToMeasure(line.id, line.measures[0].id, 'C'));
    act(() => useBoardStore.getState().duplicateLine(line.id));

    const lines = sheetLines();
    expect(lines).toHaveLength(2);
    expect(lines[1].id).not.toBe(line.id);
    expect(lines[1].measures[0].chordIds).toEqual(['C']);
    expect(lines[1].measures[0].id).not.toBe(line.measures[0].id);
  });

  it('deletes a line but refuses to delete the last one', () => {
    act(() => useBoardStore.getState().addLine());
    const firstId = sheetLines()[0].id;
    act(() => useBoardStore.getState().deleteLine(firstId));
    expect(sheetLines()).toHaveLength(1);

    const onlyId = sheetLines()[0].id;
    act(() => useBoardStore.getState().deleteLine(onlyId));
    expect(sheetLines()).toHaveLength(1);
  });

  it('grid-only actions are no-ops on the active sheet board', () => {
    const before = useBoardStore.getState().boards;
    act(() => {
      useBoardStore.getState().addTile('C', { col: 0, row: 0 });
      useBoardStore.getState().clearBoard();
    });
    expect(useBoardStore.getState().boards).toEqual(before);
  });
});
