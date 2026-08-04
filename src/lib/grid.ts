// Pure grid math for the tile dashboard. The board is a fixed-column grid that
// grows downward; tiles occupy exactly one cell.

export interface Cell {
  col: number;
  row: number;
}

export interface PlacedTile {
  id: string;
  col: number;
  row: number;
}

/** Convert a point (relative to the board's content area) to the cell under it. */
export function pointToCell(x: number, y: number, cellSize: number, cols: number): Cell {
  const col = Math.min(cols - 1, Math.max(0, Math.floor(x / cellSize)));
  const row = Math.max(0, Math.floor(y / cellSize));
  return { col, row };
}

export function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

function occupiedKeys(tiles: PlacedTile[], excludeIds?: ReadonlySet<string>): Set<string> {
  const keys = new Set<string>();
  for (const tile of tiles) {
    if (excludeIds?.has(tile.id)) continue;
    keys.add(cellKey(tile));
  }
  return keys;
}

/**
 * The free cell nearest to `target` (the target itself when free), searching in
 * expanding rings so a dropped tile "snaps like a magnet" to the closest gap.
 * The grid is unbounded downward, so a free cell always exists.
 */
export function nearestFreeCell(
  tiles: PlacedTile[],
  target: Cell,
  cols: number,
  excludeIds?: ReadonlySet<string>
): Cell {
  const occupied = occupiedKeys(tiles, excludeIds);
  const clamped: Cell = {
    col: Math.min(cols - 1, Math.max(0, target.col)),
    row: Math.max(0, target.row),
  };
  if (!occupied.has(cellKey(clamped))) return clamped;

  for (let radius = 1; ; radius++) {
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== radius) continue;
        const cell = { col: clamped.col + dCol, row: clamped.row + dRow };
        if (cell.col < 0 || cell.col >= cols || cell.row < 0) continue;
        if (occupied.has(cellKey(cell))) continue;
        const dist = (cell.col - clamped.col) ** 2 + (cell.row - clamped.row) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = cell;
        }
      }
    }
    if (best) return best;
  }
}

/**
 * Cells for duplicates of the given tiles: each copy lands on the free cell
 * nearest its original, filling in placement order. Returns cells keyed by the
 * original tile id.
 */
export function duplicatePlacements(
  tiles: PlacedTile[],
  duplicateIds: readonly string[],
  cols: number
): Map<string, Cell> {
  const placements = new Map<string, Cell>();
  const working: PlacedTile[] = [...tiles];
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));

  const ordered = [...duplicateIds]
    .map((id) => byId.get(id))
    .filter((tile): tile is PlacedTile => tile !== undefined)
    .sort((a, b) => a.row - b.row || a.col - b.col);

  for (const original of ordered) {
    const cell = nearestFreeCell(working, { col: original.col, row: original.row }, cols);
    placements.set(original.id, cell);
    working.push({ id: `dup:${original.id}`, ...cell });
  }
  return placements;
}

/** Number of rows needed to show every tile plus trailing empty space. */
export function rowCount(tiles: PlacedTile[], minRows: number): number {
  const maxRow = tiles.reduce((max, tile) => Math.max(max, tile.row), -1);
  return Math.max(minRows, maxRow + 2);
}
