import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame, writeSave } from "../store";
import { runtime, type Interaction } from "../runtime";
import { closeShop, doCheckout, pickUp, placeCarried, putBack } from "../actions";
import { readyToPay, spawnCustomer, stepCustomers, type CustomerCtx } from "../sim/customers";
import {
  CLOSE_HOUR, MINUTES_PER_SECOND, autoReorder, autoRestock, buyChance, maxCustomers, spawnInterval, stepDelivery,
  takeFromShelf, unloadAll,
} from "../sim/economy";
import {
  WORLD_BOUNDS, canPlace, computerPos, displayFootprint, inside, queueSpot, resolveCollisions, shopRect, solidRects,
  vanUnloadPos, warehouseRect, warehouseTerminalPos, type Rect,
} from "../sim/layout";
import { getProduct, DECOR_MAP } from "../sim/products";
import { submitScore } from "../leaderboard";
import type { Display } from "../sim/types";
import { CUSTOMER_MODELS } from "./Characters";

const WALK = 3.2;
const SPRINT = 5.2;
const EYE = 1.62;
const PLAYER_R = 0.3;
const LOOK_SENS = 0.0026;
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function nameOf(d: Display) {
  return d.kind === "product" ? (getProduct(d.ref)?.name ?? "item") : (DECOR_MAP[d.ref]?.name ?? "decor");
}

export function Stepper() {
  const { camera } = useThree();
  const rectCache = useRef<{ key: unknown[]; rects: Rect[] }>({ key: [], rects: [] });
  const acc = useRef({ delivery: 0 });
  const lastPrompt = useRef<string | null>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useGame.getState();
    const g = store.game;
    if (!g || store.screen !== "playing") return;
    const p = runtime.player;
    const paused = store.panel === "menu" || store.panel === "help" || store.panel === "leaderboard" || store.panel === "report";
    const uiOpen = store.panel !== null;

    // ---- look ----
    if (!uiOpen) {
      p.yaw -= runtime.look.dx * LOOK_SENS;
      p.pitch -= runtime.look.dy * LOOK_SENS;
      if (runtime.keys.has("ArrowLeft") || runtime.keys.has("KeyQ")) p.yaw += 2.2 * dt;
      if (runtime.keys.has("ArrowRight") || runtime.keys.has("KeyE_turn")) p.yaw -= 2.2 * dt;
      p.pitch = Math.max(-1.2, Math.min(0.9, p.pitch));
    }
    runtime.look.dx = 0;
    runtime.look.dy = 0;

    // ---- move ----
    const k = runtime.keys;
    let fwd = 0;
    let str = 0;
    if (!uiOpen) {
      fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - runtime.joy.y;
      str = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0) + runtime.joy.x;
    }
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    let mx = fx * fwd + rx * str;
    let mz = fz * fwd + rz * str;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const speed = k.has("ShiftLeft") || k.has("ShiftRight") ? SPRINT : WALK;
    p.moving = len > 0.05;
    if (p.moving) {
      const key = [g.shopLevel, g.warehouseLevel, g.displays, store.carriedId];
      const c = rectCache.current;
      if (c.key.length !== key.length || c.key.some((v, i) => v !== key[i])) {
        c.key = key;
        c.rects = solidRects(g.shopLevel, g.warehouseLevel, g.displays.filter((d) => d.id !== store.carriedId));
      }
      let nx = p.x + mx * speed * dt;
      let nz = p.z + mz * speed * dt;
      const res = resolveCollisions(nx, nz, PLAYER_R, c.rects);
      nx = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, res.x));
      nz = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, res.z));
      p.x = nx;
      p.z = nz;
    }

    // ---- camera ----
    const shop = shopRect(g.shopLevel);
    const wh = warehouseRect(g.shopLevel, g.warehouseLevel);
    if (store.camera === "first") {
      camera.position.set(p.x, EYE, p.z);
      camera.rotation.order = "YXZ";
      camera.rotation.set(p.pitch, p.yaw, 0);
    } else {
      const dist = 3.4;
      const cp = Math.cos(p.pitch);
      camTarget.set(p.x - fx * dist * cp, Math.max(0.5, Math.min(3.7, 1.7 - Math.sin(p.pitch) * dist)), p.z - fz * dist * cp);
      const clampIn = (r: Rect) => {
        camTarget.x = Math.max(r.minX + 0.35, Math.min(r.maxX - 0.35, camTarget.x));
        camTarget.z = Math.max(r.minZ + 0.35, Math.min(r.maxZ - 0.35, camTarget.z));
      };
      if (inside(shop, p.x, p.z)) clampIn(shop);
      else if (inside(wh, p.x, p.z)) clampIn(wh);
      camera.position.lerp(camTarget, 1 - Math.exp(-10 * dt));
      lookTarget.set(p.x + fx * 1.5, 1.35, p.z + fz * 1.5);
      camera.lookAt(lookTarget);
    }

    // ---- carry ghost ----
    if (store.carriedId) {
      const d = g.displays.find((x) => x.id === store.carriedId);
      if (d) {
        const reach = 1.1 + displayFootprint(d);
        const cx = Math.round((p.x + fx * reach) * 4) / 4;
        const cz = Math.round((p.z + fz * reach) * 4) / 4;
        runtime.carry.x = cx;
        runtime.carry.z = cz;
        runtime.carry.valid = canPlace(g.shopLevel, g.displays, d, cx, cz);
      }
    }

    if (!paused) simulate(dt, acc.current);

    // ---- interactions ----
    let inter: Interaction | null = null;
    runtime.highlightId = null;
    const gg = useGame.getState().game!;
    if (!uiOpen) {
      if (store.arrange) {
        if (store.carriedId) {
          inter = { id: "place", label: runtime.carry.valid ? "Place item" : "Can't place here", run: placeCarried };
        } else {
          let best: Display | null = null;
          let bestD = 2.8;
          for (const d of gg.displays) {
            const dx = d.x - p.x;
            const dz = d.z - p.z;
            const dist = Math.hypot(dx, dz);
            if (dist > bestD || dist < 0.01) continue;
            if ((dx * fx + dz * fz) / dist < 0.55) continue;
            best = d;
            bestD = dist;
          }
          if (best) {
            const id = best.id;
            runtime.highlightId = id;
            inter = { id: `pick-${id}`, label: `Pick up ${nameOf(best)}`, run: () => pickUp(id) };
          }
        }
      } else {
        const cp = computerPos(gg.shopLevel);
        const q0 = queueSpot(gg.shopLevel, 0);
        const ready = readyToPay(runtime.customers);
        const dComp = Math.hypot(p.x - cp.x, p.z - cp.z);
        const u = vanUnloadPos(gg.shopLevel);
        const t = warehouseTerminalPos(gg.shopLevel, gg.warehouseLevel);
        if (ready && (dComp < 2.6 || Math.hypot(p.x - q0.x, p.z - q0.z) < 2.2)) {
          const pr = getProduct(ready.productId ?? "");
          inter = { id: `checkout-${ready.id}`, label: `Checkout customer — ${pr?.name ?? ""}`, run: () => doCheckout(true) };
        } else if (dComp < 1.9) {
          inter = { id: "computer", label: "Use shop computer", run: () => useGame.getState().setPanel("computer") };
        } else if (gg.delivery.phase === "parked" && Math.hypot(p.x - u.x, p.z - u.z) < 3.2) {
          inter = { id: "van", label: "Unload delivery van", run: () => useGame.getState().setPanel("unload") };
        } else if (Math.hypot(p.x - t.x, p.z - t.z) < 2) {
          inter = { id: "warehouse", label: "Open warehouse stock", run: () => useGame.getState().setPanel("warehouse") };
        }
      }
    }
    runtime.interaction = inter;
    const label = inter?.label ?? null;
    if (label !== lastPrompt.current) {
      lastPrompt.current = label;
      store.setPrompt(label);
    }
  });
  return null;
}

function simulate(dt: number, acc: { delivery: number }) {
  const store = useGame.getState();
  let g = store.game!;
  const T = runtime.timers;

  // clock
  if (g.open && !g.dayEnded) {
    T.clockAcc += dt * MINUTES_PER_SECOND;
    if (T.clockAcc >= 1) {
      const add = Math.floor(T.clockAcc);
      T.clockAcc -= add;
      const clock = Math.min(CLOSE_HOUR, g.clock + add);
      store.setGame((s) => ({ ...s, clock }));
      if (clock >= CLOSE_HOUR) {
        store.toast("It's 9 PM — closing time!", "info");
        closeShop();
        return;
      }
    }
  }

  // delivery van
  acc.delivery += dt;
  if (acc.delivery >= 0.25) {
    const before = useGame.getState().game!;
    const after = stepDelivery(before, acc.delivery);
    acc.delivery = 0;
    if (after !== before) {
      if (before.delivery.phase !== "parked" && after.delivery.phase === "parked") store.toast("Delivery van has arrived outside! Go unload it.", "info");
      if (before.delivery.phase === "none" && after.delivery.phase === "enroute") store.toast("Delivery van is on the way", "info");
      store.setGame(() => after);
    }
  }
  g = useGame.getState().game!;

  // delivery worker auto-unload
  if (g.workers.delivery && g.delivery.phase === "parked") {
    T.autoUnload += dt;
    if (T.autoUnload > 3) {
      T.autoUnload = 0;
      const r = unloadAll(g, "shop");
      if (r.ok) {
        store.setGame(() => r.state);
        store.toast("Delivery worker unloaded the van", "good");
      }
    }
  } else T.autoUnload = 0;

  // stock worker
  if (g.workers.stocker) {
    T.restock += dt;
    if (T.restock > 5) {
      T.restock = 0;
      const after = autoRestock(useGame.getState().game!);
      if (after !== useGame.getState().game) store.setGame(() => after);
    }
  }
  // warehouse manager re-orders
  if (g.workers.warehouseManager && g.open) {
    T.reorder += dt;
    if (T.reorder > 15) {
      T.reorder = 0;
      const r = autoReorder(useGame.getState().game!);
      if (r.ordered > 0) {
        store.setGame(() => r.state);
        store.toast(`Warehouse manager re-ordered ${r.ordered} sold-out items`, "info");
      }
    }
  }

  // customers
  g = useGame.getState().game!;
  const w = runtime.customers;
  const ctx: CustomerCtx = {
    shopLevel: g.shopLevel,
    displays: g.displays,
    tryTake: (pid) => {
      const cur = useGame.getState().game!;
      const next = takeFromShelf(cur, pid);
      if (!next) return false;
      useGame.getState().setGame(() => next);
      return true;
    },
    putBack,
    lost: () => useGame.getState().setGame((s) => ({ ...s, today: { ...s.today, lost: s.today.lost + 1 } })),
    buyChance: buyChance(g),
    rand: Math.random,
  };
  if (g.open && !g.dayEnded) {
    T.spawn -= dt;
    if (T.spawn <= 0) {
      T.spawn = spawnInterval(g) * (0.6 + Math.random() * 0.8);
      const active = w.customers.filter((c) => c.state !== "leave").length;
      if (active < maxCustomers(g)) spawnCustomer(w, ctx, Math.floor(Math.random() * CUSTOMER_MODELS.length));
    }
  }
  stepCustomers(w, dt, ctx);

  // cashier
  if (g.workers.cashier && readyToPay(w)) {
    T.cashier += dt;
    if (T.cashier > 2) {
      T.cashier = 0;
      doCheckout(false);
    }
  } else T.cashier = 0;

  // keep the rendered crowd in sync
  const crowd = store.crowd;
  if (crowd.length !== w.customers.length || crowd.some((c, i) => c.id !== w.customers[i]?.id)) {
    store.setCrowd(w.customers.map((c) => ({ id: c.id, model: c.model })));
  }
  if (store.queueLen !== w.queue.length) useGame.setState({ queueLen: w.queue.length });

  // autosave + leaderboard
  T.save += dt;
  if (T.save > 4) {
    T.save = 0;
    writeSave(useGame.getState().game!);
  }
  T.board += dt;
  if (T.board > 45) {
    T.board = 0;
    void submitScore(useGame.getState().game!);
  }
}
