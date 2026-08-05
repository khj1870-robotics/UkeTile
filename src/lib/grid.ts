// Pure grid math for the tile dashboard. The board is a fixed-column grid that
// grows downward; tiles occupy exactly one cell. Tiles that are orthogonally
// adjacent form a "group" (Scratch-style magnetic connection) — groups are
// always derived from current positions, never stored, so they can't go stale.

export interface Cell {
  col: number;
  row: number;
}

export interface PlacedTile {
  id: string;
  col: number;
  row: number;
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

const NEIGHBOR_OFFSETS: readonly Cell[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

/**
 * Connected components of orthogonally-adjacent tiles (no diagonals) — the
 * "magnet" groups. Each returned array is a list of tile ids.
 */
export function computeGroups(tiles: PlacedTile[]): string[][] {
  const byKey = new Map<string, PlacedTile>();
  for (const tile of tiles) byKey.set(cellKey(tile), tile);

  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const tile of tiles) {
    if (visited.has(tile.id)) continue;
    const group: string[] = [];
    const stack: PlacedTile[] = [tile];
    visited.add(tile.id);

    while (stack.length > 0) {
      const current = stack.pop()!;
      group.push(current.id);
      for (const offset of NEIGHBOR_OFFSETS) {
        const neighbor = byKey.get(cellKey({ col: current.col + offset.col, row: current.row + offset.row }));
        if (neighbor && !visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          stack.push(neighbor);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Offsets (relative to `tileId` itself, which always maps to {col:0,row:0}) of
 * every tile connected to `tileId`. Returns null if `tileId` isn't on the board.
 */
export function groupShape(tiles: PlacedTile[], tileId: string): Map<string, Cell> | null {
  const origin = tiles.find((tile) => tile.id === tileId);
  if (!origin) return null;

  for (const group of computeGroups(tiles)) {
    if (!group.includes(tileId)) continue;
    const byId = new Map(tiles.map((tile) => [tile.id, tile]));
    const offsets = new Map<string, Cell>();
    for (const id of group) {
      const tile = byId.get(id)!;
      offsets.set(id, { col: tile.col - origin.col, row: tile.row - origin.row });
    }
    return offsets;
  }
  return null;
}

/**
 * The placement (position of the shape's {col:0,row:0} member) nearest to
 * `target` where every cell of `shape` (relative offsets) is free, searching
 * in expanding rings so a dropped shape "snaps like a magnet" to the closest
 * gap. The grid is unbounded downward, so a fit always exists eventually.
 */
export function nearestFreeAnchor(
  tiles: PlacedTile[],
  shape: readonly Cell[],
  target: Cell,
  cols: number,
  excludeIds?: ReadonlySet<string>
): Cell {
  const occupied = occupiedKeys(tiles, excludeIds);

  const minDCol = Math.min(...shape.map((c) => c.col));
  const maxDCol = Math.max(...shape.map((c) => c.col));
  const boundsCols = maxDCol - minDCol + 1 <= cols;

  const clamped: Cell = {
    col: boundsCols ? Math.min(cols - 1 - maxDCol, Math.max(-minDCol, target.col)) : target.col,
    row: Math.max(-Math.min(...shape.map((c) => c.row)), target.row),
  };

  const fits = (anchor: Cell): boolean => {
    for (const offset of shape) {
      const cell = { col: anchor.col + offset.col, row: anchor.row + offset.row };
      if (cell.row < 0) return false;
      if (boundsCols && (cell.col < 0 || cell.col >= cols)) return false;
      if (occupied.has(cellKey(cell))) return false;
    }
    return true;
  };

  if (fits(clamped)) return clamped;

  for (let radius = 1; ; radius++) {
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== radius) continue;
        const anchor = { col: clamped.col + dCol, row: clamped.row + dRow };
        if (anchor.row < 0) continue;
        if (boundsCols && (anchor.col + minDCol < 0 || anchor.col + maxDCol >= cols)) continue;
        if (!fits(anchor)) continue;
        const dist = (anchor.col - clamped.col) ** 2 + (anchor.row - clamped.row) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = anchor;
        }
      }
    }
    if (best) return best;
  }
}

/**
 * The free cell nearest to `target` (the target itself when free). Special
 * case of `nearestFreeAnchor` for a single-cell shape.
 */
export function nearestFreeCell(
  tiles: PlacedTile[],
  target: Cell,
  cols: number,
  excludeIds?: ReadonlySet<string>
): Cell {
  return nearestFreeAnchor(tiles, [{ col: 0, row: 0 }], target, cols, excludeIds);
}

/** Number of rows needed to show every tile plus trailing empty space. */
export function rowCount(tiles: PlacedTile[], minRows: number): number {
  const maxRow = tiles.reduce((max, tile) => Math.max(max, tile.row), -1);
  return Math.max(minRows, maxRow + 2);
}
