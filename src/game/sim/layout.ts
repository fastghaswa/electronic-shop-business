// World layout derived from upgrade levels. Pure maths, no three.js.
import type { Display } from "./types";
import { getProduct } from "./products";

export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }

export const WALL_H = 4.2;
export const WALL_T = 0.3;
export const DOOR_W = 3;

export const SHOP_SIZES = [
  { w: 16, d: 12 },
  { w: 22, d: 14 },
  { w: 28, d: 16 },
  { w: 36, d: 18 },
];

export function shopRect(shopLevel: number): Rect {
  const s = SHOP_SIZES[Math.min(Math.max(shopLevel, 1), SHOP_SIZES.length) - 1]!;
  return { minX: -s.w / 2, maxX: s.w / 2, minZ: -s.d / 2, maxZ: s.d / 2 };
}

export const WAREHOUSE_W = [8, 10, 12, 14, 16];
export function warehouseRect(shopLevel: number, warehouseLevel: number): Rect {
  const s = shopRect(shopLevel);
  const w = WAREHOUSE_W[Math.min(Math.max(warehouseLevel, 1), WAREHOUSE_W.length) - 1]!;
  const minX = s.maxX + 2.5;
  return { minX, maxX: minX + w, minZ: s.minZ, maxZ: s.minZ + 10 };
}

/** Side doors between shop and warehouse (z centre). */
export function sideDoorZ(shopLevel: number) {
  return shopRect(shopLevel).minZ + 2.5;
}

export function counterPos(shopLevel: number) {
  const s = shopRect(shopLevel);
  return { x: s.minX + 3, z: s.maxZ - 4.2, len: 3 };
}
/** Where the computer sits / player stands to use it. */
export function computerPos(shopLevel: number) {
  const c = counterPos(shopLevel);
  return { x: c.x - 0.35, z: c.z };
}
export function cashierSpot(shopLevel: number) {
  const c = counterPos(shopLevel);
  return { x: c.x - 1.1, z: c.z + 0.6 };
}
export function queueSpot(shopLevel: number, i: number) {
  const c = counterPos(shopLevel);
  return { x: c.x + 1.1 + i * 0.85, z: c.z };
}
export function doorPos(shopLevel: number) {
  const s = shopRect(shopLevel);
  return { x: 0, z: s.maxZ };
}
export function warehouseTerminalPos(shopLevel: number, warehouseLevel: number) {
  const w = warehouseRect(shopLevel, warehouseLevel);
  return { x: w.minX + 1.6, z: w.maxZ - 1.2 };
}
/** Road runs along x in front of the shop: sidewalk 0..5 m, road 5..12 m from the shop front. */
export function roadZ(shopLevel: number) {
  return shopRect(shopLevel).maxZ + 8.5;
}
export function vanParkPos(shopLevel: number) {
  const s = shopRect(shopLevel);
  return { x: s.maxX + 1, z: s.maxZ + 6.7 };
}
/** Spot behind the van (on the sidewalk) where the player unloads. */
export function vanUnloadPos(shopLevel: number) {
  const v = vanParkPos(shopLevel);
  return { x: v.x - 3.6, z: v.z - 1.4 };
}

function wallWithGap(axis: "x" | "z", fixed: number, from: number, to: number, gapC: number | null, gapW: number): Rect[] {
  const h = WALL_T / 2;
  const segs: [number, number][] = gapC === null ? [[from, to]] : [[from, gapC - gapW / 2], [gapC + gapW / 2, to]];
  return segs
    .filter(([a, b]) => b - a > 0.01)
    .map(([a, b]) =>
      axis === "x"
        ? { minX: a, maxX: b, minZ: fixed - h, maxZ: fixed + h }
        : { minX: fixed - h, maxX: fixed + h, minZ: a, maxZ: b },
    );
}

export interface WallSeg extends Rect { glass?: boolean }

export function wallRects(shopLevel: number, warehouseLevel: number): WallSeg[] {
  const s = shopRect(shopLevel);
  const w = warehouseRect(shopLevel, warehouseLevel);
  const sd = sideDoorZ(shopLevel);
  return [
    ...wallWithGap("x", s.minZ, s.minX, s.maxX, null, 0),
    ...wallWithGap("x", s.maxZ, s.minX, s.maxX, 0, DOOR_W).map((r) => ({ ...r, glass: true })),
    ...wallWithGap("z", s.minX, s.minZ, s.maxZ, null, 0),
    ...wallWithGap("z", s.maxX, s.minZ, s.maxZ, sd, 2),
    // warehouse
    ...wallWithGap("x", w.minZ, w.minX, w.maxX, null, 0),
    ...wallWithGap("x", w.maxZ, w.minX, w.maxX, w.minX + 4.2, DOOR_W),
    ...wallWithGap("z", w.minX, w.minZ, w.maxZ, sd, 2),
    ...wallWithGap("z", w.maxX, w.minZ, w.maxZ, null, 0),
  ];
}

export function counterRect(shopLevel: number): Rect {
  const c = counterPos(shopLevel);
  return { minX: c.x - 0.4, maxX: c.x + 0.4, minZ: c.z - c.len / 2, maxZ: c.z + c.len / 2 };
}

export function displayFootprint(d: Display): number {
  if (d.kind === "decor") return d.ref === "shelf" || d.ref === "table" ? 0.9 : 0.5;
  const p = getProduct(d.ref);
  if (!p) return 0.8;
  if (p.small) return 0.75;
  return 0.95;
}

export function displayRect(d: Display, x = d.x, z = d.z): Rect {
  const h = displayFootprint(d) / 2;
  return { minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h };
}

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.minX < b.maxX + pad && a.maxX > b.minX - pad && a.minZ < b.maxZ + pad && a.maxZ > b.minZ - pad;
}

export function inside(r: Rect, x: number, z: number, margin = 0): boolean {
  return x > r.minX + margin && x < r.maxX - margin && z > r.minZ + margin && z < r.maxZ - margin;
}

/** Facing vector for a rotation in quarter turns (0 => +z). */
export function facing(rot: number) {
  const a = (rot % 4) * (Math.PI / 2);
  return { x: Math.sin(a), z: Math.cos(a) };
}

/** Can a display be placed at (x,z)? Must be inside the shop, clear of walls, counter, door lane and others. */
export function canPlace(shopLevel: number, displays: Display[], d: Display, x: number, z: number): boolean {
  const s = shopRect(shopLevel);
  const fp = displayFootprint(d) / 2;
  if (!inside(s, x, z, fp + WALL_T)) return false;
  const r = displayRect(d, x, z);
  if (rectsOverlap(r, counterRect(shopLevel), 1.2)) return false;
  // keep the entrance lane free
  if (rectsOverlap(r, { minX: -1.5, maxX: 1.5, minZ: s.maxZ - 2.5, maxZ: s.maxZ }, 0)) return false;
  // keep the queue lane free
  const q0 = queueSpot(shopLevel, 0);
  if (rectsOverlap(r, { minX: q0.x - 0.5, maxX: q0.x + 4, minZ: q0.z - 0.6, maxZ: q0.z + 0.6 }, 0)) return false;
  // side door lane
  const sd = sideDoorZ(shopLevel);
  if (rectsOverlap(r, { minX: s.maxX - 2, maxX: s.maxX, minZ: sd - 1.2, maxZ: sd + 1.2 }, 0)) return false;
  for (const o of displays) {
    if (o.id === d.id) continue;
    if (rectsOverlap(r, displayRect(o), 0.15)) return false;
  }
  return true;
}

/** Candidate auto-placement slots: back wall row, right wall row, then islands. */
export function candidateSlots(shopLevel: number): { x: number; z: number; rot: number }[] {
  const s = shopRect(shopLevel);
  const out: { x: number; z: number; rot: number }[] = [];
  for (let x = s.minX + 1.4; x <= s.maxX - 1.4; x += 1.6) out.push({ x, z: s.minZ + 1.0, rot: 0 });
  for (let z = s.minZ + 3.6; z <= s.maxZ - 3; z += 1.6) out.push({ x: s.maxX - 1.0, z, rot: 3 });
  for (let row = s.minZ + 4; row <= s.maxZ - 4.5; row += 3.2) {
    for (let x = s.minX + 6.5; x <= s.maxX - 4; x += 1.6) {
      out.push({ x, z: row, rot: 0 });
    }
  }
  return out;
}

export function findFreeSlot(shopLevel: number, displays: Display[], d: Display) {
  for (const c of candidateSlots(shopLevel)) {
    if (canPlace(shopLevel, displays, d, c.x, c.z)) return c;
  }
  // fallback: grid scan
  const s = shopRect(shopLevel);
  for (let z = s.minZ + 1; z < s.maxZ - 1; z += 0.5)
    for (let x = s.minX + 1; x < s.maxX - 1; x += 0.5)
      if (canPlace(shopLevel, displays, d, x, z)) return { x, z, rot: 0 };
  return null;
}

/** Spot where a customer stands to look at a display. */
export function viewSpot(d: Display) {
  const f = facing(d.rot);
  const dist = displayFootprint(d) / 2 + 0.6;
  return { x: d.x + f.x * dist, z: d.z + f.z * dist };
}

/** Solid rectangles the player collides with. */
export function solidRects(shopLevel: number, warehouseLevel: number, displays: Display[]): Rect[] {
  return [...wallRects(shopLevel, warehouseLevel), counterRect(shopLevel), ...displays.map((d) => displayRect(d))];
}

/** Push a circle (x,z,r) out of rects. Returns corrected position. */
export function resolveCollisions(x: number, z: number, r: number, rects: Rect[]) {
  for (let iter = 0; iter < 2; iter++) {
    for (const b of rects) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          z = cz + (dz / d) * r;
        } else {
          // centre inside the rect: push out along the shallowest axis
          const pushes = [b.minX - r - x, b.maxX + r - x, b.minZ - r - z, b.maxZ + r - z];
          const abs = pushes.map(Math.abs);
          const i = abs.indexOf(Math.min(...abs));
          if (i < 2) x += pushes[i]!;
          else z += pushes[i]!;
        }
      }
    }
  }
  return { x, z };
}

export const WORLD_BOUNDS: Rect = { minX: -70, maxX: 90, minZ: -40, maxZ: 40 };
