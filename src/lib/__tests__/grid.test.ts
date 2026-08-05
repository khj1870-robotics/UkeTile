import {
  cellKey,
  computeGroups,
  groupShape,
  nearestFreeAnchor,
  nearestFreeCell,
  nextFreeCellRightward,
  rowCount,
  sequentialFreeCells,
  type PlacedTile,
} from '@/lib/grid';

describe('nearestFreeCell', () => {
  it('returns the target cell when it is free', () => {
    const cell = nearestFreeCell([], { col: 1, row: 1 }, 4);
    expect(cell).toEqual({ col: 1, row: 1 });
  });

  it('finds the nearest free cell when the target is occupied', () => {
    const tiles: PlacedTile[] = [{ id: 'a', col: 1, row: 1 }];
    const cell = nearestFreeCell(tiles, { col: 1, row: 1 }, 4);
    expect(cell).not.toEqual({ col: 1, row: 1 });
    // Should be an immediate neighbor (ring radius 1).
    const dist = (cell.col - 1) ** 2 + (cell.row - 1) ** 2;
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('excludes the given tile ids from occupancy (used when moving a tile)', () => {
    const tiles: PlacedTile[] = [{ id: 'a', col: 1, row: 1 }];
    const cell = nearestFreeCell(tiles, { col: 1, row: 1 }, 4, new Set(['a']));
    expect(cell).toEqual({ col: 1, row: 1 });
  });

  it('never gets stuck when the whole grid width is full', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 2, row: 0 },
      { id: 'd', col: 3, row: 0 },
    ];
    const cell = nearestFreeCell(tiles, { col: 1, row: 0 }, 4);
    expect(cell.row).toBeGreaterThan(0);
  });
});

describe('computeGroups', () => {
  it('returns no groups for an empty board', () => {
    expect(computeGroups([])).toEqual([]);
  });

  it('treats isolated tiles as separate singleton groups', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 3, row: 3 },
    ];
    const groups = computeGroups(tiles).map((g) => g.sort());
    expect(groups).toHaveLength(2);
    expect(groups).toContainEqual(['a']);
    expect(groups).toContainEqual(['b']);
  });

  it('connects a plus-shaped cluster into one group', () => {
    const tiles: PlacedTile[] = [
      { id: 'center', col: 1, row: 1 },
      { id: 'up', col: 1, row: 0 },
      { id: 'down', col: 1, row: 2 },
      { id: 'left', col: 0, row: 1 },
      { id: 'right', col: 2, row: 1 },
    ];
    const groups = computeGroups(tiles);
    expect(groups).toHaveLength(1);
    expect(groups[0].sort()).toEqual(['center', 'down', 'left', 'right', 'up']);
  });

  it('connects an L-shape into one group', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 0, row: 1 },
      { id: 'c', col: 1, row: 1 },
    ];
    expect(computeGroups(tiles)).toHaveLength(1);
  });

  it('keeps separate clusters apart', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 3, row: 3 },
      { id: 'd', col: 4, row: 3 },
    ];
    const groups = computeGroups(tiles).map((g) => g.sort());
    expect(groups).toHaveLength(2);
    expect(groups).toContainEqual(['a', 'b']);
    expect(groups).toContainEqual(['c', 'd']);
  });

  it('does not connect diagonally-adjacent tiles', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 1 },
    ];
    expect(computeGroups(tiles)).toHaveLength(2);
  });

  it('connects a straight line of tiles', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 2, row: 0 },
      { id: 'd', col: 3, row: 0 },
    ];
    expect(computeGroups(tiles)).toHaveLength(1);
  });
});

describe('groupShape', () => {
  it('returns null for an unknown tile id', () => {
    expect(groupShape([{ id: 'a', col: 0, row: 0 }], 'missing')).toBeNull();
  });

  it('maps an isolated tile to itself at the origin', () => {
    const shape = groupShape([{ id: 'a', col: 5, row: 5 }], 'a');
    expect(shape).toEqual(new Map([['a', { col: 0, row: 0 }]]));
  });

  it('computes consistent offsets regardless of which member is the reference', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
    ];
    const fromA = groupShape(tiles, 'a')!;
    expect(fromA.get('a')).toEqual({ col: 0, row: 0 });
    expect(fromA.get('b')).toEqual({ col: 1, row: 0 });

    const fromB = groupShape(tiles, 'b')!;
    expect(fromB.get('b')).toEqual({ col: 0, row: 0 });
    expect(fromB.get('a')).toEqual({ col: -1, row: 0 });
  });

  it('computes internally-consistent offsets for an L-shape from a non-corner reference', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 2, row: 2 },
      { id: 'b', col: 2, row: 3 },
      { id: 'c', col: 3, row: 3 },
    ];
    const shape = groupShape(tiles, 'b')!;
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const origin = byId.get('b')!;
    for (const [id, offset] of shape) {
      const real = byId.get(id)!;
      expect(offset).toEqual({ col: real.col - origin.col, row: real.row - origin.row });
    }
  });
});

describe('nearestFreeAnchor', () => {
  it('behaves like nearestFreeCell for a single-cell shape', () => {
    const tiles: PlacedTile[] = [{ id: 'a', col: 1, row: 1 }];
    const anchor = nearestFreeAnchor(tiles, [{ col: 0, row: 0 }], { col: 1, row: 1 }, 4);
    expect(anchor).not.toEqual({ col: 1, row: 1 });
  });

  it('places a multi-cell shape at the target when fully free', () => {
    const shape = [{ col: 0, row: 0 }, { col: 1, row: 0 }];
    const anchor = nearestFreeAnchor([], shape, { col: 0, row: 0 }, 4);
    expect(anchor).toEqual({ col: 0, row: 0 });
  });

  it('avoids collisions when part of the shape would overlap an existing tile', () => {
    const tiles: PlacedTile[] = [{ id: 'x', col: 1, row: 0 }];
    const shape = [{ col: 0, row: 0 }, { col: 1, row: 0 }];
    const anchor = nearestFreeAnchor(tiles, shape, { col: 0, row: 0 }, 4);
    const occupiedByShape = shape.map((o) => cellKey({ col: anchor.col + o.col, row: anchor.row + o.row }));
    expect(occupiedByShape).not.toContain(cellKey(tiles[0]));
  });

  it('lets a group drop back onto its own current cells via excludeIds', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 2, row: 2 },
      { id: 'b', col: 3, row: 2 },
    ];
    const shape = [{ col: 0, row: 0 }, { col: 1, row: 0 }];
    const anchor = nearestFreeAnchor(tiles, shape, { col: 2, row: 2 }, 4, new Set(['a', 'b']));
    expect(anchor).toEqual({ col: 2, row: 2 });
  });

  it('moves to a new row when the whole target row is packed', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 2, row: 0 },
      { id: 'd', col: 3, row: 0 },
    ];
    const anchor = nearestFreeAnchor(tiles, [{ col: 0, row: 0 }], { col: 1, row: 0 }, 4);
    expect(anchor.row).toBeGreaterThan(0);
  });

  it('terminates for a shape wider than the grid (defensive path)', () => {
    const shape = [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }, { col: 4, row: 0 }];
    const anchor = nearestFreeAnchor([], shape, { col: 0, row: 0 }, 4);
    expect(anchor).toBeDefined();
  });
});

describe('nextFreeCellRightward', () => {
  it('returns the starting cell when free', () => {
    expect(nextFreeCellRightward([], { col: 1, row: 0 }, 4)).toEqual({ col: 1, row: 0 });
  });

  it('scans rightward past occupied cells before wrapping', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 1, row: 0 },
      { id: 'b', col: 2, row: 0 },
    ];
    expect(nextFreeCellRightward(tiles, { col: 1, row: 0 }, 4)).toEqual({ col: 3, row: 0 });
  });

  it('wraps to the next row once the current row is full', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 2, row: 0 },
      { id: 'd', col: 3, row: 0 },
    ];
    expect(nextFreeCellRightward(tiles, { col: 2, row: 0 }, 4)).toEqual({ col: 0, row: 1 });
  });
});

describe('sequentialFreeCells', () => {
  it('lines up N cells left-to-right starting at the given cell', () => {
    const cells = sequentialFreeCells([], { col: 0, row: 0 }, 3, 4);
    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ]);
  });

  it('skips existing tiles and wraps rows, never colliding', () => {
    const tiles: PlacedTile[] = [{ id: 'a', col: 1, row: 0 }];
    const cells = sequentialFreeCells(tiles, { col: 0, row: 0 }, 5, 4);
    const allKeys = [...tiles.map(cellKey), ...cells.map(cellKey)];
    expect(new Set(allKeys).size).toBe(allKeys.length);
    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });
});

describe('rowCount', () => {
  it('returns at least minRows when the board is empty', () => {
    expect(rowCount([], 5)).toBe(5);
  });

  it('grows to fit the lowest tile plus one spare row', () => {
    const tiles: PlacedTile[] = [{ id: 'a', col: 0, row: 6 }];
    expect(rowCount(tiles, 5)).toBe(8);
  });
});
