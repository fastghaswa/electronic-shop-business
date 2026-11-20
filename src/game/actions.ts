// Game actions shared by the HUD, keyboard and the per-frame stepper.
import { useGame } from "./store";
import { runtime } from "./runtime";
import { checkout, evacuate, readyToPay, type CustomerCtx } from "./sim/customers";
import { completeSale, endDay, formatMoney, openShop as openShopRule, returnToShelf, startNextDay } from "./sim/economy";
import { getProduct } from "./sim/products";
import { canPlace } from "./sim/layout";
import { submitScore } from "./leaderboard";
import { writeSave } from "./store";

export function putBack(pid: string) {
  useGame.getState().setGame((g) => returnToShelf(g, pid));
}

export function doCheckout(byPlayer: boolean) {
  const st = useGame.getState();
  const g = st.game;
  if (!g) return false;
  const pid = checkout(runtime.customers, { shopLevel: g.shopLevel, rand: Math.random });
  if (!pid) return false;
  const r = completeSale(g, pid);
  st.setGame(() => r.state);
  const p = getProduct(pid);
  st.toast(`${byPlayer ? "Sold" : "Cashier sold"} ${p?.name ?? "item"} +${formatMoney(p?.retail ?? 0)} • +${r.xp} XP`, "good");
  if (r.leveledUp) {
    st.toast(`LEVEL UP! You are now level ${r.state.level} — new products & upgrades unlocked`, "good");
  }
  return true;
}

export function canCheckoutNow() {
  return !!readyToPay(runtime.customers);
}

export function openShop() {
  const st = useGame.getState();
  st.setGame(openShopRule);
  st.toast("Shop is OPEN — customers are on their way!", "good");
}

export function closeShop() {
  const st = useGame.getState();
  const g = st.game;
  if (!g) return;
  evacuate(runtime.customers, { shopLevel: g.shopLevel, rand: Math.random, putBack });
  st.setGame(endDay);
  const after = useGame.getState().game;
  if (after) {
    writeSave(after);
    void submitScore(after);
  }
  st.setPanel("report");
}

export function nextDay() {
  const st = useGame.getState();
  st.setGame(startNextDay);
  st.setPanel(null);
  const g = useGame.getState().game;
  if (g) writeSave(g);
  st.toast(`Day ${g?.day} — open the shop when you're ready`, "info");
}

export function rotateCarry() {
  const st = useGame.getState();
  if (st.carriedId) st.setCarry(st.carriedId, (st.carryRot + 1) % 4);
}

export function placeCarried() {
  const st = useGame.getState();
  const g = st.game;
  if (!g || !st.carriedId) return;
  const d = g.displays.find((x) => x.id === st.carriedId);
  if (!d) return st.setCarry(null);
  const { x, z } = runtime.carry;
  if (!canPlace(g.shopLevel, g.displays, d, x, z)) {
    st.toast("Can't place here — keep it inside the shop, clear of the door, counter and other items", "bad");
    return;
  }
  st.setGame((gg) => ({ ...gg, displays: gg.displays.map((o) => (o.id === d.id ? { ...o, x, z, rot: st.carryRot } : o)) }));
  st.setCarry(null);
}

export function pickUp(id: string) {
  const st = useGame.getState();
  const d = st.game?.displays.find((x) => x.id === id);
  if (d) st.setCarry(id, d.rot);
}

export type { CustomerCtx };
