/**
 * Zero-GC 2D Spatial Hash Grid for XZ arena collision & squad neighbor lookups.
 *
 * Designed for Dell Latitude E5430 / Intel HD 4000 thermal & GC safety:
 * - Pre-allocates cell buckets and reuses them across frames via `clear()` (0 per-frame allocations).
 * - Queries write results into a caller-owned `out` array (`out.length = 0`) to eliminate GC pressure.
 * - Replaces O(N^2) neighbor scans in high-density waves with O(1) localized cell queries.
 */
export interface SpatialEntity2D {
  id: number;
  x: number;
  z: number;
  radius: number;
}

export class SpatialHashGrid<T extends SpatialEntity2D> {
  private readonly invCellSize: number;
  private readonly buckets = new Map<number, T[]>();
  private readonly activeKeys: number[] = [];

  constructor(cellSize = 4.0) {
    const safeCell = Number.isFinite(cellSize) && cellSize >= 0.5 ? cellSize : 4.0;
    this.invCellSize = 1 / safeCell;
  }

  private hashCoords(cx: number, cz: number): number {
    // Pack signed 16-bit grid coords (-32768..32767) into a single SMI integer (zero string allocation)
    return ((cx + 32768) << 16) | ((cz + 32768) & 0xffff);
  }

  public clear(): void {
    for (let i = 0; i < this.activeKeys.length; i++) {
      const bucket = this.buckets.get(this.activeKeys[i]);
      if (bucket) bucket.length = 0;
    }
    this.activeKeys.length = 0;
  }

  public insert(item: T): void {
    const cx = Math.floor(item.x * this.invCellSize);
    const cz = Math.floor(item.z * this.invCellSize);
    const key = this.hashCoords(cx, cz);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    if (bucket.length === 0) {
      this.activeKeys.push(key);
    }
    bucket.push(item);
  }

  /**
   * Populates caller-provided `out` array with all entities whose center is within
   * `radius + entity.radius` of `(x, z)`, excluding `excludeId` if provided.
   * Zero allocations on steady-state calls.
   */
  public queryRadius(
    x: number,
    z: number,
    radius: number,
    out: T[],
    excludeId?: number
  ): T[] {
    out.length = 0;
    const safeR = Math.max(0, radius);
    // Add 1.5u padding for neighbor entity radius so boundary overlaps are never missed
    const searchSpan = safeR + 1.5;
    const minCx = Math.floor((x - searchSpan) * this.invCellSize);
    const maxCx = Math.floor((x + searchSpan) * this.invCellSize);
    const minCz = Math.floor((z - searchSpan) * this.invCellSize);
    const maxCz = Math.floor((z + searchSpan) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.buckets.get(this.hashCoords(cx, cz));
        if (!bucket || bucket.length === 0) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          if (excludeId !== undefined && item.id === excludeId) continue;
          const dx = item.x - x;
          const dz = item.z - z;
          const maxD = safeR + item.radius;
          if (dx * dx + dz * dz <= maxD * maxD) {
            out.push(item);
          }
        }
      }
    }
    return out;
  }

  public get activeBucketCount(): number {
    return this.activeKeys.length;
  }
}
