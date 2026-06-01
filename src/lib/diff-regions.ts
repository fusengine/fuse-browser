/**
 * Group a pixelmatch diff mask into changed-region bounding boxes. Quantizes
 * diff pixels onto a coarse grid (cellSize) then flood-fills adjacent dirty
 * cells into rectangles — O(cells), no per-pixel recursion. Pure & testable.
 * @module lib/diff-regions
 */

/** A rectangular zone (in pixels) that changed between two images. */
export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bounding boxes of changed clusters from an RGBA diff `mask` (pixelmatch marks
 * changed pixels red). A grid cell is dirty when it holds >= `minPerCell` diff
 * pixels; adjacent dirty cells (4-connected) merge into one region.
 */
export function computeDiffRegions(
  mask: Uint8Array,
  width: number,
  height: number,
  cellSize = 16,
  minPerCell = 2,
): DiffRegion[] {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const dirty = new Uint32Array(cols * rows);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (mask[p] && mask[p + 1] === 0 && mask[p + 2] === 0) {
        const ci = Math.floor(y / cellSize) * cols + Math.floor(x / cellSize);
        dirty[ci] = (dirty[ci] ?? 0) + 1;
      }
    }
  }
  const flagged = dirty.map((n) => (n >= minPerCell ? 1 : 0));
  const seen = new Uint8Array(cols * rows);
  const regions: DiffRegion[] = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (!flagged[cy * cols + cx] || seen[cy * cols + cx]) continue;
      let minX = cx;
      let maxX = cx;
      let minY = cy;
      let maxY = cy;
      const stack = [[cx, cy]];
      seen[cy * cols + cx] = 1;
      while (stack.length) {
        const [x, y] = stack.pop() as [number, number];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Array<[number, number]>) {
          const i = ny * cols + nx;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && flagged[i] && !seen[i]) {
            seen[i] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      regions.push({
        x: minX * cellSize,
        y: minY * cellSize,
        width: Math.min((maxX + 1) * cellSize, width) - minX * cellSize,
        height: Math.min((maxY + 1) * cellSize, height) - minY * cellSize,
      });
    }
  }
  return regions;
}
