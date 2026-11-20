// Customer behaviour. Pure TypeScript: positions + state machine.
import type { Display } from "./types";
import { doorPos, queueSpot, shopRect, viewSpot } from "./layout";

export type CustomerState = "enter" | "browse" | "toQueue" | "queue" | "leave" | "gone";

export interface Customer {
  id: number;
  model: number;
  x: number;
  z: number;
  yaw: number;
  state: CustomerState;
  path: { x: number; z: number }[];
  displayId: string | null;
  productId: string | null;
  carrying: boolean;
  timer: number;
  patience: number;
  walking: boolean;
  mood: "happy" | "sad" | null;
  moodTimer: number;
}

export const CUSTOMER_SPEED = 1.5;
export const BROWSE_TIME = 3;
export const QUEUE_PATIENCE = 45;

export interface CustomerCtx {
  shopLevel: number;
  displays: Display[];
  /** Try to pick one unit from the shelf. */
  tryTake: (pid: string) => boolean;
  /** Put an unsold unit back. */
  putBack: (pid: string) => void;
  /** Customer leaves without buying. */
  lost: () => void;
  buyChance: number;
  rand: () => number;
}

export interface CustomerWorld {
  customers: Customer[];
  queue: number[];
  nextId: number;
}

export function newCustomerWorld(): CustomerWorld {
  return { customers: [], queue: [], nextId: 1 };
}

function aisleZ(shopLevel: number) {
  return shopRect(shopLevel).maxZ - 3;
}

export function spawnCustomer(w: CustomerWorld, ctx: CustomerCtx, model: number) {
  const candidates = ctx.displays.filter((d) => d.kind === "product");
  if (candidates.length === 0) return;
  const d = candidates[Math.floor(ctx.rand() * candidates.length)]!;
  const door = doorPos(ctx.shopLevel);
  const side = ctx.rand() < 0.5 ? -1 : 1;
  const sx = side * (18 + ctx.rand() * 8);
  const sz = door.z + 3.2;
  const spot = viewSpot(d);
  const az = aisleZ(ctx.shopLevel);
  w.customers.push({
    id: w.nextId++,
    model,
    x: sx,
    z: sz,
    yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    state: "enter",
    path: [
      { x: door.x, z: door.z + 1.5 },
      { x: door.x, z: door.z - 1.6 },
      { x: spot.x, z: az },
      spot,
    ],
    displayId: d.id,
    productId: d.ref,
    carrying: false,
    timer: 0,
    patience: QUEUE_PATIENCE,
    walking: true,
    mood: null,
    moodTimer: 0,
  });
}

function leavePath(shopLevel: number, from: { x: number; z: number }, rand: () => number) {
  const door = doorPos(shopLevel);
  const side = rand() < 0.5 ? -1 : 1;
  return [
    { x: from.x, z: aisleZ(shopLevel) },
    { x: door.x, z: door.z - 1.6 },
    { x: door.x, z: door.z + 1.5 },
    { x: side * 30, z: door.z + 3.2 },
  ];
}

function moveAlong(c: Customer, dt: number): boolean {
  let remaining = CUSTOMER_SPEED * dt;
  while (remaining > 0 && c.path.length > 0) {
    const t = c.path[0]!;
    const dx = t.x - c.x;
    const dz = t.z - c.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-3) {
      c.path.shift();
      continue;
    }
    const step = Math.min(dist, remaining);
    c.x += (dx / dist) * step;
    c.z += (dz / dist) * step;
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - c.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    c.yaw += dy * Math.min(1, dt * 10);
    remaining -= step;
    if (step >= dist) c.path.shift();
  }
  c.walking = c.path.length > 0;
  return c.path.length === 0;
}

function sendAway(c: Customer, ctx: CustomerCtx, mood: "happy" | "sad") {
  c.state = "leave";
  c.mood = mood;
  c.moodTimer = 3;
  c.path = leavePath(ctx.shopLevel, c, ctx.rand);
}

export function stepCustomers(w: CustomerWorld, dt: number, ctx: CustomerCtx) {
  for (const c of w.customers) {
    if (c.moodTimer > 0) c.moodTimer -= dt;
    switch (c.state) {
      case "enter": {
        const disp = ctx.displays.find((d) => d.id === c.displayId);
        if (!disp) {
          sendAway(c, ctx, "sad");
          ctx.lost();
          break;
        }
        if (moveAlong(c, dt)) {
          c.state = "browse";
          c.timer = BROWSE_TIME * (0.7 + ctx.rand() * 0.6);
          c.yaw = Math.atan2(disp.x - c.x, disp.z - c.z);
        }
        break;
      }
      case "browse": {
        c.timer -= dt;
        if (c.timer <= 0) {
          const pid = c.productId!;
          if (ctx.rand() < ctx.buyChance && ctx.tryTake(pid)) {
            c.carrying = true;
            c.state = "toQueue";
            w.queue.push(c.id);
            c.path = [{ x: c.x, z: aisleZ(ctx.shopLevel) }, queueSpot(ctx.shopLevel, w.queue.length - 1)];
          } else {
            ctx.lost();
            sendAway(c, ctx, "sad");
          }
        }
        break;
      }
      case "toQueue":
      case "queue": {
        const idx = w.queue.indexOf(c.id);
        const spot = queueSpot(ctx.shopLevel, Math.max(0, idx));
        if (c.state === "toQueue") {
          if (c.path.length > 0) c.path[c.path.length - 1] = spot;
          else c.path = [spot];
          if (moveAlong(c, dt)) c.state = "queue";
        } else {
          if (Math.hypot(c.x - spot.x, c.z - spot.z) > 0.05) {
            c.path = [spot];
            moveAlong(c, dt);
          } else {
            c.walking = false;
            c.yaw = -Math.PI / 2; // face the counter (towards -x)
          }
        }
        c.patience -= dt;
        if (c.patience <= 0) {
          w.queue = w.queue.filter((id) => id !== c.id);
          if (c.carrying && c.productId) ctx.putBack(c.productId);
          c.carrying = false;
          ctx.lost();
          sendAway(c, ctx, "sad");
        }
        break;
      }
      case "leave": {
        if (moveAlong(c, dt)) c.state = "gone";
        break;
      }
    }
  }
  w.customers = w.customers.filter((c) => c.state !== "gone");
}

/** The customer at the front of the queue who is ready to pay, if any. */
export function readyToPay(w: CustomerWorld): Customer | null {
  const id = w.queue[0];
  if (id === undefined) return null;
  const c = w.customers.find((x) => x.id === id);
  return c && c.state === "queue" ? c : null;
}

/** Complete checkout for the front customer. Returns the product sold. */
export function checkout(w: CustomerWorld, ctx: Pick<CustomerCtx, "shopLevel" | "rand">): string | null {
  const c = readyToPay(w);
  if (!c || !c.productId) return null;
  w.queue.shift();
  const pid = c.productId;
  c.carrying = true; // carries the bag out
  c.state = "leave";
  c.mood = "happy";
  c.moodTimer = 3;
  c.path = leavePath(ctx.shopLevel, c, ctx.rand);
  return pid;
}

/** Close shop: everyone leaves, held items go back on the shelf. */
export function evacuate(w: CustomerWorld, ctx: Pick<CustomerCtx, "shopLevel" | "rand" | "putBack">) {
  for (const c of w.customers) {
    if (c.state === "leave") continue;
    if (c.carrying && c.productId) ctx.putBack(c.productId);
    c.carrying = false;
    c.state = "leave";
    c.path = leavePath(ctx.shopLevel, c, ctx.rand);
  }
  w.queue = [];
}
