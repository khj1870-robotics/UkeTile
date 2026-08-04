import {
  cellKey,
  duplicatePlacements,
  nearestFreeCell,
  pointToCell,
  rowCount,
  type PlacedTile,
} from '@/lib/grid';

describe('pointToCell', () => {
  it('maps a point to its containing cell', () => {
    expect(pointToCell(0, 0, 100, 4)).toEqual({ col: 0, row: 0 });
    expect(pointToCell(150, 250, 100, 4)).toEqual({ col: 1, row: 2 });
  });

  it('clamps columns to the grid width', () => {
    expect(pointToCell(999, 0, 100, 4)).toEqual({ col: 3, row: 0 });
    expect(pointToCell(-50, -50, 100, 4)).toEqual({ col: 0, row: 0 });
  });
});

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

describe('duplicatePlacements', () => {
  it('places each duplicate on the free cell nearest its original', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 2, row: 2 },
    ];
    const placements = duplicatePlacements(tiles, ['a', 'b'], 4);
    expect(placements.size).toBe(2);
    expect(placements.get('a')).not.toEqual({ col: 0, row: 0 });
    expect(placements.get('b')).not.toEqual({ col: 2, row: 2 });
  });

  it('does not place two duplicates on the same cell', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
    ];
    const placements = duplicatePlacements(tiles, ['a', 'b'], 4);
    const keys = [...placements.values()].map(cellKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('duplicates several tiles at once without colliding', () => {
    const tiles: PlacedTile[] = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 2, row: 0 },
    ];
    const placements = duplicatePlacements(tiles, ['a', 'b', 'c'], 4);
    expect(placements.size).toBe(3);
    const allKeys = [...tiles.map(cellKey), ...[...placements.values()].map(cellKey)];
    expect(new Set(allKeys).size).toBe(allKeys.length);
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
