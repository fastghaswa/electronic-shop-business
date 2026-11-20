// Game economy rules. Pure functions over GameState.
import type { DayStats, Display, GameState, WorkerRole } from "./types";
import { DECOR_MAP, PRODUCTS, getProduct } from "./products";
import { findFreeSlot } from "./layout";

export const START_MONEY = 10_000;
export const OPEN_HOUR = 9 * 60;
export const CLOSE_HOUR = 21 * 60;
/** Game minutes advanced per real second while the shop is open. */
export const MINUTES_PER_SECOND = 2;

export interface WorkerDef { role: WorkerRole; title: string; unlock: number; hireCost: number; salary: number; job: string }
export const WORKERS: WorkerDef[] = [
  { role: "cashier", title: "Cashier", unlock: 2, hireCost: 1500, salary: 300, job: "Checks out customers at the counter automatically." },
  { role: "salesman", title: "Salesman", unlock: 3, hireCost: 2500, salary: 450, job: "Brings in 35% more customers and helps them decide to buy." },
  { role: "stocker", title: "Stock Worker", unlock: 4, hireCost: 3000, salary: 500, job: "Refills shop displays from the warehouse." },
  { role: "warehouseManager", title: "Warehouse Manager", unlock: 5, hireCost: 5000, salary: 700, job: "Re-orders sold-out products and adds 25% warehouse space." },
  { role: "delivery", title: "Delivery Worker", unlock: 6, hireCost: 4000, salary: 600, job: "Unloads delivery vans and speeds up deliveries." },
];
export const WORKER_MAP = Object.fromEntries(WORKERS.map((w) => [w.role, w])) as Record<WorkerRole, WorkerDef>;

export const SHOP_UPGRADES = [
  { level: 1, cost: 0, unlock: 1, maxDisplays: 10, capacity: 40, name: "Small Shop" },
  { level: 2, cost: 25_000, unlock: 3, maxDisplays: 18, capacity: 90, name: "Electronics Store" },
  { level: 3, cost: 75_000, unlock: 5, maxDisplays: 28, capacity: 160, name: "Mega Store" },
  { level: 4, cost: 200_000, unlock: 8, maxDisplays: 40, capacity: 260, name: "Grand Showroom" },
];
export const WAREHOUSE_UPGRADES = [
  { level: 1, cost: 0, unlock: 1, capacity: 60 },
  { level: 2, cost: 8_000, unlock: 2, capacity: 120 },
  { level: 3, cost: 20_000, unlock: 4, capacity: 200 },
  { level: 4, cost: 50_000, unlock: 6, capacity: 320 },
  { level: 5, cost: 120_000, unlock: 8, capacity: 500 },
];
export const MAX_DECOR = 14;

export function xpForNext(level: number) {
  return Math.round(100 * Math.pow(level, 1.5));
}
export function saleXp(profit: number) {
  return 5 + Math.floor(Math.max(0, profit) / 40);
}

export function emptyDay(day: number): DayStats {
  return { day, revenue: 0, cogs: 0, purchases: 0, salaries: 0, rent: 0, upgrades: 0, sold: 0, customers: 0, lost: 0 };
}

function uid() {
  if (typeof crypto === "undefined") {
    throw new Error("Secure random generator is unavailable");
  }

  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}
export function newId() {
  return uid();
}

export function newGame(playerName: string): GameState {
  const state: GameState = {
    version: 1,
    playerId: uid(),
    secret: uid() + uid(),
    playerName: playerName.trim().slice(0, 24) || "Shopkeeper",
    money: START_MONEY,
    level: 1,
    xp: 0,
    day: 1,
    clock: OPEN_HOUR,
    open: false,
    dayEnded: false,
    shopLevel: 1,
    warehouseLevel: 1,
    shopStock: {},
    warehouseStock: {},
    displays: [],
    workers: { cashier: false, salesman: false, stocker: false, warehouseManager: false, delivery: false },
    delivery: { phase: "none", items: {}, timer: 0 },
    orderQueue: {},
    today: emptyDay(1),
    history: [],
    totals: { revenue: 0, profit: 0, sold: 0 },
  };
  // A starter display shelf and plant so the shop doesn't feel empty
  state.displays.push({ id: uid(), kind: "decor", ref: "plant", x: -1.8, z: 4.6, rot: 0 });
  state.displays.push({ id: uid(), kind: "decor", ref: "plant", x: 1.8, z: 4.6, rot: 0 });
  return state;
}

export type Result = { ok: true; state: GameState; msg?: string } | { ok: false; error: string };

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function shopCapacity(s: GameState) {
  return SHOP_UPGRADES[s.shopLevel - 1]!.capacity;
}
export function maxDisplays(s: GameState) {
  return SHOP_UPGRADES[s.shopLevel - 1]!.maxDisplays;
}
export function warehouseCapacity(s: GameState) {
  const base = WAREHOUSE_UPGRADES[s.warehouseLevel - 1]!.capacity;
  return Math.round(base * (s.workers.warehouseManager ? 1.25 : 1));
}
export function shopUnits(s: GameState) {
  return sum(s.shopStock);
}
export function warehouseUnits(s: GameState) {
  return sum(s.warehouseStock);
}
export function productDisplays(s: GameState) {
  return s.displays.filter((d) => d.kind === "product");
}
export function incomingUnits(s: GameState, pid?: string) {
  const all = { ...s.orderQueue };
  for (const [k, v] of Object.entries(s.delivery.items)) all[k] = (all[k] ?? 0) + v;
  return pid ? (all[pid] ?? 0) : sum(all);
}

export function unlockedProducts(level: number) {
  return PRODUCTS.filter((p) => p.unlock <= level);
}

/** Place an order. Cost is deducted now; goods arrive by van. */
export function placeOrder(s: GameState, cart: Record<string, number>): Result {
  let cost = 0;
  let units = 0;
  for (const [pid, q] of Object.entries(cart)) {
    const p = getProduct(pid);
    if (!p || q <= 0) continue;
    if (p.unlock > s.level) return { ok: false, error: `${p.name} unlocks at level ${p.unlock}` };
    cost += p.wholesale * q;
    units += q;
  }
  if (units === 0) return { ok: false, error: "Your cart is empty" };
  if (cost > s.money) return { ok: false, error: "Not enough money for this order" };
  const orderQueue = { ...s.orderQueue };
  for (const [pid, q] of Object.entries(cart)) if (q > 0) orderQueue[pid] = (orderQueue[pid] ?? 0) + q;
  return {
    ok: true,
    state: { ...s, money: s.money - cost, orderQueue, today: { ...s.today, purchases: s.today.purchases + cost } },
    msg: `Order placed: ${units} items for ₹${cost.toLocaleString("en-IN")}`,
  };
}

/** Delivery van timeline (real seconds). */
export const VAN_DRIVE_TIME = 5;
export function deliveryEta(s: GameState) {
  return s.workers.delivery ? 8 : 16;
}

export function stepDelivery(s: GameState, dt: number): GameState {
  const d = s.delivery;
  if (d.phase === "none") {
    if (sum(s.orderQueue) > 0) {
      return { ...s, orderQueue: {}, delivery: { phase: "enroute", items: { ...s.orderQueue }, timer: deliveryEta(s) } };
    }
    return s;
  }
  if (d.phase === "enroute") {
    let items = d.items;
    let orderQueue = s.orderQueue;
    if (sum(orderQueue) > 0) {
      items = { ...items };
      for (const [k, v] of Object.entries(orderQueue)) items[k] = (items[k] ?? 0) + v;
      orderQueue = {};
    }
    const t = d.timer - dt;
    return { ...s, orderQueue, delivery: t <= 0 ? { phase: "arriving", items, timer: VAN_DRIVE_TIME } : { ...d, items, timer: t } };
  }
  if (d.phase === "arriving") {
    const t = d.timer - dt;
    return { ...s, delivery: t <= 0 ? { ...d, phase: "parked", timer: 0 } : { ...d, timer: t } };
  }
  if (d.phase === "parked") {
    if (sum(d.items) === 0) return { ...s, delivery: { phase: "leaving", items: {}, timer: VAN_DRIVE_TIME } };
    return s;
  }
  // leaving
  const t = d.timer - dt;
  return { ...s, delivery: t <= 0 ? { phase: "none", items: {}, timer: 0 } : { ...d, timer: t } };
}

function ensureDisplay(s: GameState, pid: string): { state: GameState; ok: boolean } {
  if (s.displays.some((d) => d.kind === "product" && d.ref === pid)) return { state: s, ok: true };
  if (productDisplays(s).length >= maxDisplays(s)) return { state: s, ok: false };
  const d: Display = { id: uid(), kind: "product", ref: pid, x: 0, z: 0, rot: 0 };
  const slot = findFreeSlot(s.shopLevel, s.displays, d);
  if (!slot) return { state: s, ok: false };
  return { state: { ...s, displays: [...s.displays, { ...d, ...slot }] }, ok: true };
}

/** Unload items from the parked van into shop or warehouse. */
export function unload(s: GameState, pid: string, qty: number, to: "shop" | "warehouse"): Result {
  if (s.delivery.phase !== "parked") return { ok: false, error: "No van is parked" };
  const have = s.delivery.items[pid] ?? 0;
  const q = Math.min(qty, have);
  if (q <= 0) return { ok: false, error: "Nothing to unload" };
  let st = s;
  let moved = q;
  if (to === "shop") {
    const free = shopCapacity(st) - shopUnits(st);
    moved = Math.min(q, free);
    if (moved <= 0) return { ok: false, error: "Shop floor is full — use the warehouse" };
    const r = ensureDisplay(st, pid);
    if (!r.ok) return { ok: false, error: "No free display space in the shop — upgrade or rearrange" };
    st = r.state;
    st = { ...st, shopStock: { ...st.shopStock, [pid]: (st.shopStock[pid] ?? 0) + moved } };
  } else {
    const free = warehouseCapacity(st) - warehouseUnits(st);
    moved = Math.min(q, free);
    if (moved <= 0) return { ok: false, error: "Warehouse is full — upgrade capacity" };
    st = { ...st, warehouseStock: { ...st.warehouseStock, [pid]: (st.warehouseStock[pid] ?? 0) + moved } };
  }
  const items = { ...st.delivery.items, [pid]: have - moved };
  if (items[pid]! <= 0) delete items[pid];
  return { ok: true, state: { ...st, delivery: { ...st.delivery, items } } };
}

export function unloadAll(s: GameState, to: "shop" | "warehouse"): Result {
  let st = s;
  let any = false;
  let lastErr = "";
  for (const [pid, q] of Object.entries(s.delivery.items)) {
    let r = unload(st, pid, q, to);
    if (!r.ok && to === "shop") r = unload(st, pid, q, "warehouse");
    if (r.ok) {
      st = r.state;
      any = true;
    } else lastErr = r.error;
  }
  return any ? { ok: true, state: st } : { ok: false, error: lastErr || "Nothing to unload" };
}

/** Move stock between shop floor and warehouse. */
export function transfer(s: GameState, pid: string, qty: number, to: "shop" | "warehouse"): Result {
  const from = to === "shop" ? s.warehouseStock : s.shopStock;
  const have = from[pid] ?? 0;
  let q = Math.min(qty, have);
  if (q <= 0) return { ok: false, error: "No stock to move" };
  let st = s;
  if (to === "shop") {
    q = Math.min(q, shopCapacity(st) - shopUnits(st));
    if (q <= 0) return { ok: false, error: "Shop floor is full" };
    const r = ensureDisplay(st, pid);
    if (!r.ok) return { ok: false, error: "No free display space in the shop" };
    st = r.state;
    st = {
      ...st,
      warehouseStock: { ...st.warehouseStock, [pid]: have - q },
      shopStock: { ...st.shopStock, [pid]: (st.shopStock[pid] ?? 0) + q },
    };
  } else {
    q = Math.min(q, warehouseCapacity(st) - warehouseUnits(st));
    if (q <= 0) return { ok: false, error: "Warehouse is full" };
    st = {
      ...st,
      shopStock: { ...st.shopStock, [pid]: have - q },
      warehouseStock: { ...st.warehouseStock, [pid]: (st.warehouseStock[pid] ?? 0) + q },
    };
  }
  return { ok: true, state: clean(st) };
}

function clean(s: GameState): GameState {
  const f = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).filter(([, v]) => v > 0));
  return { ...s, shopStock: f(s.shopStock), warehouseStock: f(s.warehouseStock) };
}

/** A customer takes one unit from the shelf. Returns null when sold out. */
export function takeFromShelf(s: GameState, pid: string): GameState | null {
  const q = s.shopStock[pid] ?? 0;
  if (q <= 0) return null;
  return { ...s, shopStock: { ...s.shopStock, [pid]: q - 1 } };
}
export function returnToShelf(s: GameState, pid: string): GameState {
  return { ...s, shopStock: { ...s.shopStock, [pid]: (s.shopStock[pid] ?? 0) + 1 } };
}

export interface SaleResult { state: GameState; xp: number; leveledUp: boolean }
/** Complete a checkout for one unit that the customer already picked up. */
export function completeSale(s: GameState, pid: string): SaleResult {
  const p = getProduct(pid)!;
  const profit = p.retail - p.wholesale;
  const xpGain = saleXp(profit);
  let level = s.level;
  let xp = s.xp + xpGain;
  let leveledUp = false;
  while (xp >= xpForNext(level)) {
    xp -= xpForNext(level);
    level++;
    leveledUp = true;
  }
  const today = { ...s.today, revenue: s.today.revenue + p.retail, cogs: s.today.cogs + p.wholesale, sold: s.today.sold + 1, customers: s.today.customers + 1 };
  return {
    state: {
      ...s,
      money: s.money + p.retail,
      level,
      xp,
      today,
      totals: { revenue: s.totals.revenue + p.retail, profit: s.totals.profit + profit, sold: s.totals.sold + 1 },
    },
    xp: xpGain,
    leveledUp,
  };
}

export function dailySalaries(s: GameState) {
  return WORKERS.reduce((a, w) => a + (s.workers[w.role] ? w.salary : 0), 0);
}
export function dailyRent(s: GameState) {
  return 200 * s.shopLevel + 100 * s.warehouseLevel;
}
export function netProfit(d: DayStats) {
  return d.revenue - d.cogs - d.salaries - d.rent;
}

export function openShop(s: GameState): GameState {
  if (s.dayEnded) return s;
  return { ...s, open: true };
}

/** End the day: pay salaries and rent, archive the report. */
export function endDay(s: GameState): GameState {
  if (s.dayEnded) return s;
  const salaries = dailySalaries(s);
  const rent = dailyRent(s);
  const today = { ...s.today, salaries, rent };
  return {
    ...s,
    open: false,
    dayEnded: true,
    money: s.money - salaries - rent,
    today,
    totals: { ...s.totals, profit: s.totals.profit - salaries - rent },
  };
}

export function startNextDay(s: GameState): GameState {
  const history = [...s.history, s.today].slice(-30);
  return { ...s, day: s.day + 1, clock: OPEN_HOUR, open: false, dayEnded: false, today: emptyDay(s.day + 1), history };
}

export function hire(s: GameState, role: WorkerRole): Result {
  const w = WORKER_MAP[role];
  if (s.workers[role]) return { ok: false, error: `${w.title} already hired` };
  if (s.level < w.unlock) return { ok: false, error: `${w.title} unlocks at level ${w.unlock}` };
  if (s.money < w.hireCost) return { ok: false, error: "Not enough money" };
  return { ok: true, state: { ...s, money: s.money - w.hireCost, workers: { ...s.workers, [role]: true }, today: { ...s.today, upgrades: s.today.upgrades + w.hireCost } }, msg: `${w.title} hired!` };
}
export function fire(s: GameState, role: WorkerRole): Result {
  if (!s.workers[role]) return { ok: false, error: "Not hired" };
  return { ok: true, state: { ...s, workers: { ...s.workers, [role]: false } } };
}

export function upgradeShop(s: GameState): Result {
  const next = SHOP_UPGRADES[s.shopLevel];
  if (!next) return { ok: false, error: "Shop is fully upgraded" };
  if (s.level < next.unlock) return { ok: false, error: `Unlocks at level ${next.unlock}` };
  if (s.money < next.cost) return { ok: false, error: "Not enough money" };
  return { ok: true, state: { ...s, money: s.money - next.cost, shopLevel: next.level, today: { ...s.today, upgrades: s.today.upgrades + next.cost } }, msg: `Shop expanded to ${next.name}!` };
}
export function upgradeWarehouse(s: GameState): Result {
  const next = WAREHOUSE_UPGRADES[s.warehouseLevel];
  if (!next) return { ok: false, error: "Warehouse is fully upgraded" };
  if (s.level < next.unlock) return { ok: false, error: `Unlocks at level ${next.unlock}` };
  if (s.money < next.cost) return { ok: false, error: "Not enough money" };
  return { ok: true, state: { ...s, money: s.money - next.cost, warehouseLevel: next.level, today: { ...s.today, upgrades: s.today.upgrades + next.cost } }, msg: `Warehouse capacity is now ${next.capacity}` };
}

export function buyDecor(s: GameState, decorId: string): Result {
  const d = DECOR_MAP[decorId];
  if (!d) return { ok: false, error: "Unknown item" };
  if (s.level < d.unlock) return { ok: false, error: `Unlocks at level ${d.unlock}` };
  if (s.money < d.cost) return { ok: false, error: "Not enough money" };
  if (s.displays.filter((x) => x.kind === "decor").length >= MAX_DECOR) return { ok: false, error: "Decor limit reached" };
  const disp: Display = { id: uid(), kind: "decor", ref: decorId, x: 0, z: 0, rot: 0 };
  const slot = findFreeSlot(s.shopLevel, s.displays, disp);
  if (!slot) return { ok: false, error: "No free floor space" };
  return { ok: true, state: { ...s, money: s.money - d.cost, displays: [...s.displays, { ...disp, ...slot }], today: { ...s.today, upgrades: s.today.upgrades + d.cost } }, msg: `${d.name} placed — rearrange it in Arrange mode` };
}

/** Remove a product display, moving its shelf stock to the warehouse. */
export function removeDisplay(s: GameState, id: string): Result {
  const d = s.displays.find((x) => x.id === id);
  if (!d) return { ok: false, error: "Not found" };
  let st = s;
  if (d.kind === "product") {
    const q = st.shopStock[d.ref] ?? 0;
    if (q > warehouseCapacity(st) - warehouseUnits(st)) return { ok: false, error: "Warehouse has no room for this stock" };
    st = { ...st, shopStock: { ...st.shopStock, [d.ref]: 0 }, warehouseStock: { ...st.warehouseStock, [d.ref]: (st.warehouseStock[d.ref] ?? 0) + q } };
  } else {
    const refund = Math.round((DECOR_MAP[d.ref]?.cost ?? 0) * 0.5);
    st = { ...st, money: st.money + refund };
  }
  return { ok: true, state: clean({ ...st, displays: st.displays.filter((x) => x.id !== id) }) };
}

export function decorAppeal(s: GameState) {
  return Math.min(0.3, s.displays.reduce((a, d) => a + (d.kind === "decor" ? (DECOR_MAP[d.ref]?.appeal ?? 0) : 0), 0));
}

/** Seconds between customer arrivals. */
export function spawnInterval(s: GameState) {
  const stocked = productDisplays(s).filter((d) => (s.shopStock[d.ref] ?? 0) > 0).length;
  const base = Math.max(3, 13 - s.level * 0.6 - s.shopLevel * 0.8 - Math.min(stocked, 20) * 0.25);
  return base / ((s.workers.salesman ? 1.35 : 1) * (1 + decorAppeal(s)));
}
export function maxCustomers(s: GameState) {
  return Math.min(16, 3 + s.shopLevel * 2 + Math.floor(s.level / 2));
}
export function buyChance(s: GameState) {
  return Math.min(0.97, 0.8 + (s.workers.salesman ? 0.12 : 0) + decorAppeal(s) * 0.2);
}

/** Stock worker: refill shop items that run low from the warehouse. */
export function autoRestock(s: GameState): GameState {
  let st = s;
  for (const [pid, q] of Object.entries(s.warehouseStock)) {
    if (q <= 0) continue;
    const onShelf = st.shopStock[pid] ?? 0;
    if (onShelf >= 3) continue;
    const r = transfer(st, pid, 4 - onShelf, "shop");
    if (r.ok) st = r.state;
  }
  return st;
}

/** Warehouse manager: re-order products that are completely sold out. */
export function autoReorder(s: GameState): { state: GameState; ordered: number } {
  let st = s;
  let ordered = 0;
  for (const d of productDisplays(s)) {
    const pid = d.ref;
    const p = getProduct(pid);
    if (!p) continue;
    const total = (st.shopStock[pid] ?? 0) + (st.warehouseStock[pid] ?? 0) + incomingUnits(st, pid);
    if (total > 0) continue;
    const qty = p.retail > 20000 ? 2 : 4;
    if (st.money < p.wholesale * qty * 2) continue;
    const r = placeOrder(st, { [pid]: qty });
    if (r.ok) {
      st = r.state;
      ordered += qty;
    }
  }
  return { state: st, ordered };
}

export function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}
export function formatClock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}
