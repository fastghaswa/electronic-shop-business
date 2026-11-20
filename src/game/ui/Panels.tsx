import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, Boxes, ClipboardList, Lock, Minus, Package, Plus, ShoppingCart, Sofa, TrendingUp, Truck, UserPlus, Warehouse, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGame, writeSave } from "../store";
import { nextDay } from "../actions";
import { CATEGORIES, DECOR, PRODUCTS, getProduct, type Category } from "../sim/products";
import {
  SHOP_UPGRADES, WAREHOUSE_UPGRADES, WORKERS, buyDecor, dailyRent, dailySalaries, fire, formatMoney, hire, incomingUnits,
  maxDisplays, netProfit, placeOrder, productDisplays, shopCapacity, shopUnits, transfer, unload, unloadAll, upgradeShop,
  upgradeWarehouse, warehouseCapacity, warehouseUnits, deliveryEta,
} from "../sim/economy";
import type { DayStats } from "../sim/types";
import { LeaderboardTable } from "./Leaderboard";

function Shell({ title, icon, children, wide }: { title: string; icon?: ReactNode; children: ReactNode; wide?: boolean }) {
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-background/40 p-2 sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && setPanel(null)}>
      <div className={cn("glass flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl", wide ? "max-w-5xl" : "max-w-xl")}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">{icon}{title}</h2>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setPanel(null)}><X /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-secondary/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-display text-base font-bold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</div>
    </div>
  );
}

// ---------- Order ----------
function OrderTab() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const [cat, setCat] = useState<Category | "All">("All");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const list = PRODUCTS.filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.unlock - b.unlock || a.wholesale - b.wholesale);
  const total = Object.entries(cart).reduce((a, [id, n]) => a + (getProduct(id)?.wholesale ?? 0) * n, 0);
  const units = Object.values(cart).reduce((a, b) => a + b, 0);
  const add = (id: string, d: number) => setCart((c) => {
    const n = Math.max(0, Math.min(50, (c[id] ?? 0) + d));
    const next = { ...c, [id]: n };
    if (n === 0) delete next[id];
    return next;
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors", cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted")}>{c}</button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 70+ products…" className="bg-secondary" />
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((p) => {
          const locked = p.unlock > g.level;
          const have = (g.shopStock[p.id] ?? 0) + (g.warehouseStock[p.id] ?? 0);
          return (
            <div key={p.id} className={cn("flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2.5", locked && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{p.category} • Have {have}{incomingUnits(g, p.id) ? ` (+${incomingUnits(g, p.id)} coming)` : ""}</div>
                <div className="mt-0.5 text-xs">
                  <span className="text-muted-foreground">Buy </span><span className="font-semibold tabular-nums">{formatMoney(p.wholesale)}</span>
                  <span className="text-muted-foreground"> • Sell </span><span className="font-semibold tabular-nums text-success">{formatMoney(p.retail)}</span>
                </div>
              </div>
              {locked ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Lv {p.unlock}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="secondary" className="size-7" aria-label="Less" onClick={() => add(p.id, -1)}><Minus /></Button>
                  <span className="w-6 text-center text-sm tabular-nums">{cart[p.id] ?? 0}</span>
                  <Button size="icon" variant="secondary" className="size-7" aria-label="More" onClick={() => add(p.id, 1)}><Plus /></Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-3 -mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-panel-strong p-3 sm:-mx-4 sm:-mb-4">
        <div className="text-sm">
          <span className="text-muted-foreground">{units} items • </span>
          <span className={cn("font-display text-lg font-bold tabular-nums", total > g.money ? "text-destructive" : "text-primary")}>{formatMoney(total)}</span>
          <span className="ml-2 text-xs text-muted-foreground">Balance {formatMoney(g.money)} • Arrives in ~{deliveryEta(g)}s</span>
        </div>
        <Button variant="brand" disabled={units === 0} onClick={() => { if (act((s) => placeOrder(s, cart))) setCart({}); }}>
          <Truck /> Place order
        </Button>
      </div>
    </div>
  );
}

// ---------- Inventory / transfer ----------
export function InventoryTab() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const ids = Array.from(new Set([...Object.keys(g.shopStock), ...Object.keys(g.warehouseStock), ...productDisplays(g).map((d) => d.ref)]));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Shop floor" value={`${shopUnits(g)}/${shopCapacity(g)}`} />
        <Stat label="Displays" value={`${productDisplays(g).length}/${maxDisplays(g)}`} />
        <Stat label="Warehouse" value={`${warehouseUnits(g)}/${warehouseCapacity(g)}`} />
        <Stat label="Incoming" value={`${incomingUnits(g)}`} />
      </div>
      {ids.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No stock yet. Order products from the shop computer.</p>}
      <div className="space-y-1.5">
        {ids.map((id) => {
          const p = getProduct(id);
          if (!p) return null;
          const s = g.shopStock[id] ?? 0;
          const w = g.warehouseStock[id] ?? 0;
          return (
            <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 p-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">Shop {s} • Warehouse {w}</div>
              </div>
              <Button size="sm" variant="secondary" disabled={w === 0} onClick={() => act((st) => transfer(st, id, 1, "shop"))}>+1 to shop</Button>
              <Button size="sm" variant="secondary" disabled={w === 0} onClick={() => act((st) => transfer(st, id, w, "shop"))}>All to shop</Button>
              <Button size="sm" variant="ghost" disabled={s === 0} onClick={() => act((st) => transfer(st, id, s, "warehouse"))}><Warehouse /> Store all</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Workers ----------
function WorkersTab() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {WORKERS.map((w) => {
        const hired = g.workers[w.role];
        const locked = g.level < w.unlock;
        return (
          <div key={w.role} className={cn("rounded-lg border border-border bg-card/60 p-3", hired && "border-success/60")}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{w.title}</div>
              {hired ? <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">HIRED</span> : locked ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Level {w.unlock}</span> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{w.job}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span>Hire {formatMoney(w.hireCost)} • Salary {formatMoney(w.salary)}/day</span>
              {hired ? (
                <Button size="sm" variant="ghost" onClick={() => act((s) => fire(s, w.role))}>Let go</Button>
              ) : (
                <Button size="sm" variant="brand" disabled={locked} onClick={() => act((s) => hire(s, w.role))}><UserPlus /> Hire</Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Upgrades ----------
function UpgradesTab() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const ns = SHOP_UPGRADES[g.shopLevel];
  const nw = WAREHOUSE_UPGRADES[g.warehouseLevel];
  const cur = SHOP_UPGRADES[g.shopLevel - 1]!;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Showroom</div>
        <div className="font-display text-lg font-bold">{cur.name}</div>
        <p className="text-xs text-muted-foreground">{cur.maxDisplays} displays • {cur.capacity} items on the floor</p>
        {ns ? (
          <div className="mt-3 rounded-md bg-secondary/70 p-2 text-sm">
            <div className="font-semibold">Expand to {ns.name}</div>
            <div className="text-xs text-muted-foreground">{ns.maxDisplays} displays • {ns.capacity} floor items • bigger building</div>
            <Button className="mt-2 w-full" variant="brand" disabled={g.level < ns.unlock} onClick={() => act(upgradeShop)}>
              {g.level < ns.unlock ? <><Lock /> Level {ns.unlock}</> : <>Expand for {formatMoney(ns.cost)}</>}
            </Button>
          </div>
        ) : <p className="mt-3 text-sm text-success">Maximum size reached!</p>}
      </div>
      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Warehouse</div>
        <div className="font-display text-lg font-bold">Level {g.warehouseLevel}</div>
        <p className="text-xs text-muted-foreground">Capacity {warehouseCapacity(g)} items</p>
        {nw ? (
          <div className="mt-3 rounded-md bg-secondary/70 p-2 text-sm">
            <div className="font-semibold">Upgrade to {nw.capacity} items</div>
            <div className="text-xs text-muted-foreground">More racks and a larger building</div>
            <Button className="mt-2 w-full" variant="brand" disabled={g.level < nw.unlock} onClick={() => act(upgradeWarehouse)}>
              {g.level < nw.unlock ? <><Lock /> Level {nw.unlock}</> : <>Upgrade for {formatMoney(nw.cost)}</>}
            </Button>
          </div>
        ) : <p className="mt-3 text-sm text-success">Maximum capacity reached!</p>}
      </div>
    </div>
  );
}

function DecorTab() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const setArrange = useGame((s) => s.setArrange);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Decor attracts more customers. After buying, press B (or the Arrange button) to move and rotate anything in your shop.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {DECOR.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-2.5">
            <div>
              <div className="text-sm font-semibold">{d.name}</div>
              <div className="text-[11px] text-muted-foreground">+{Math.round(d.appeal * 100)}% appeal • {formatMoney(d.cost)}</div>
            </div>
            <Button size="sm" variant="brand" disabled={g.level < d.unlock} onClick={() => act((s) => buyDecor(s, d.id))}>{g.level < d.unlock ? `Lv ${d.unlock}` : "Buy"}</Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="w-full" onClick={() => { useGame.getState().setPanel(null); setArrange(true); }}><Sofa /> Arrange my shop now</Button>
    </div>
  );
}

export function DayReport({ d }: { d: DayStats }) {
  const net = netProfit(d);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Stat label="Sales revenue" value={formatMoney(d.revenue)} tone="good" />
      <Stat label="Cost of goods sold" value={formatMoney(d.cogs)} />
      <Stat label="Gross profit" value={formatMoney(d.revenue - d.cogs)} tone={d.revenue - d.cogs >= 0 ? "good" : "bad"} />
      <Stat label="Stock purchased" value={formatMoney(d.purchases)} />
      <Stat label="Salaries" value={formatMoney(d.salaries)} />
      <Stat label="Rent & electricity" value={formatMoney(d.rent)} />
      <Stat label="Hiring & upgrades" value={formatMoney(d.upgrades)} />
      <Stat label="Items sold" value={`${d.sold}`} />
      <Stat label="Customers lost" value={`${d.lost}`} tone={d.lost > 0 ? "bad" : undefined} />
      <div className="col-span-2 rounded-lg bg-brand p-3 text-primary-foreground sm:col-span-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider">Net profit (revenue − cost of goods − salaries − rent)</div>
        <div className="font-display text-2xl font-extrabold tabular-nums">{formatMoney(net)}</div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const g = useGame((s) => s.game)!;
  const days = [...g.history].reverse();
  const today = { ...g.today, salaries: g.dayEnded ? g.today.salaries : dailySalaries(g), rent: g.dayEnded ? g.today.rent : dailyRent(g) };
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Today (Day {g.day}){!g.dayEnded && <span className="text-xs font-normal text-muted-foreground"> — salaries & rent are paid at closing</span>}</h3>
        <DayReport d={today} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Lifetime earnings" value={formatMoney(g.totals.revenue)} />
        <Stat label="Lifetime profit" value={formatMoney(g.totals.profit)} tone={g.totals.profit >= 0 ? "good" : "bad"} />
        <Stat label="Products sold" value={`${g.totals.sold}`} />
      </div>
      {days.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Previous days</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary text-muted-foreground">
                <tr><th className="px-2 py-1.5 text-left">Day</th><th className="px-2 py-1.5 text-right">Sales</th><th className="px-2 py-1.5 text-right">Expenses</th><th className="px-2 py-1.5 text-right">Net profit</th><th className="px-2 py-1.5 text-right">Sold</th></tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-t border-border/60">
                    <td className="px-2 py-1.5">{d.day}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(d.revenue)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(d.purchases + d.salaries + d.rent + d.upgrades)}</td>
                    <td className={cn("px-2 py-1.5 text-right font-semibold tabular-nums", netProfit(d) >= 0 ? "text-success" : "text-destructive")}>{formatMoney(netProfit(d))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{d.sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "order", label: "Order stock", icon: ShoppingCart },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "workers", label: "Workers", icon: UserPlus },
  { id: "upgrades", label: "Upgrades", icon: TrendingUp },
  { id: "decor", label: "Decor", icon: Sofa },
  { id: "reports", label: "Reports", icon: ClipboardList },
] as const;

function ComputerPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("order");
  return (
    <Shell title="Ghaswa Shop Computer" icon={<Package className="size-5 text-primary" />} wide>
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-muted")}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>
      {tab === "order" && <OrderTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "workers" && <WorkersTab />}
      {tab === "upgrades" && <UpgradesTab />}
      {tab === "decor" && <DecorTab />}
      {tab === "reports" && <ReportsTab />}
    </Shell>
  );
}

function UnloadPanel() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const items = Object.entries(g.delivery.items).filter(([, q]) => q > 0);
  return (
    <Shell title="Unload delivery van" icon={<Truck className="size-5 text-primary" />}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="Shop floor space" value={`${shopCapacity(g) - shopUnits(g)} free`} />
        <Stat label="Warehouse space" value={`${warehouseCapacity(g) - warehouseUnits(g)} free`} />
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">The van is empty — it will drive off now.</p>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <Button className="flex-1" variant="brand" onClick={() => act((s) => unloadAll(s, "shop"))}><ArrowRight /> All to shop</Button>
            <Button className="flex-1" variant="secondary" onClick={() => act((s) => unloadAll(s, "warehouse"))}><Warehouse /> All to warehouse</Button>
          </div>
          <div className="space-y-1.5">
            {items.map(([id, q]) => (
              <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{getProduct(id)?.name}</div>
                  <div className="text-[11px] text-muted-foreground">{q} boxes</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => act((s) => unload(s, id, q, "shop"))}>To shop</Button>
                <Button size="sm" variant="ghost" onClick={() => act((s) => unload(s, id, q, "warehouse"))}>To warehouse</Button>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function WarehousePanel() {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const nw = WAREHOUSE_UPGRADES[g.warehouseLevel];
  return (
    <Shell title="Warehouse stock" icon={<Warehouse className="size-5 text-primary" />} wide>
      {nw && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/70 p-2.5 text-sm">
          <span>Upgrade capacity to <b>{nw.capacity}</b> items</span>
          <Button size="sm" variant="brand" disabled={g.level < nw.unlock} onClick={() => act(upgradeWarehouse)}>
            {g.level < nw.unlock ? `Level ${nw.unlock}` : formatMoney(nw.cost)}
          </Button>
        </div>
      )}
      <InventoryTab />
    </Shell>
  );
}

function ReportPanel() {
  const g = useGame((s) => s.game)!;
  return (
    <Shell title={`Day ${g.day} report`} icon={<ClipboardList className="size-5 text-primary" />}>
      <DayReport d={g.today} />
      <p className="mt-3 text-xs text-muted-foreground">Balance after paying salaries and rent: <b className="text-foreground">{formatMoney(g.money)}</b></p>
      {g.dayEnded && <Button variant="brand" size="xl" className="mt-4 w-full" onClick={nextDay}>Start day {g.day + 1}</Button>}
    </Shell>
  );
}

function MenuPanel() {
  const g = useGame((s) => s.game)!;
  const setPanel = useGame((s) => s.setPanel);
  const quit = useGame((s) => s.quitToMenu);
  const toast = useGame((s) => s.toast);
  const [name, setName] = useState(g.playerName);
  return (
    <Shell title="Menu">
      <div className="space-y-2">
        <Button className="w-full" variant="brand" onClick={() => setPanel(null)}>Resume</Button>
        <Button className="w-full" variant="secondary" onClick={() => { writeSave(g); toast("Game saved", "good"); }}>Save now</Button>
        <Button className="w-full" variant="secondary" onClick={() => setPanel("help")}>How to play</Button>
        <Button className="w-full" variant="secondary" onClick={() => setPanel("leaderboard")}>Leaderboard</Button>
        <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); useGame.getState().setGame((s) => ({ ...s, playerName: name.trim().slice(0, 24) || s.playerName })); toast("Name updated", "good"); }}>
          <Input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="bg-secondary" aria-label="Player name" />
          <Button type="submit" variant="secondary">Rename</Button>
        </form>
        <Button className="w-full" variant="ghost" onClick={quit}>Save & quit to title</Button>
        <p className="pt-2 text-center text-[11px] text-muted-foreground">Your progress saves automatically every few seconds.</p>
      </div>
    </Shell>
  );
}

function HelpPanel() {
  const rows = useMemo(() => [
    ["Walk", "WASD / arrows • joystick on mobile", "Run: Shift"],
    ["Look", "Click the game, then move the mouse • drag on mobile", ""],
    ["Interact", "E (or tap the glowing button)", "computer, van, warehouse, checkout"],
    ["Camera", "V switches first / third person", ""],
    ["Arrange", "B: look at an item, E to pick up, R rotate, E place", ""],
    ["Shop", "O opens / closes the shop", "M menu • L leaderboard"],
  ], []);
  return (
    <Shell title="How to run GHASWA ELECTRONIC">
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm">
        <li>Walk behind the counter and use the <b>computer</b> (gold ring) to order stock at wholesale price.</li>
        <li>A <b>delivery van</b> pulls up outside — walk to the boxes and unload into the shop or warehouse.</li>
        <li><b>Open the shop</b>. Customers browse displays and queue at the counter — stand at the counter and press E to check them out.</li>
        <li>Earn profit & XP, level up, hire workers, expand the showroom and climb the global leaderboard.</li>
      </ol>
      <div className="space-y-1.5">
        {rows.map(([a, b, c]) => (
          <div key={a} className="flex gap-3 rounded-lg bg-secondary/70 px-3 py-2 text-sm">
            <b className="w-20 shrink-0 text-primary">{a}</b>
            <span>{b}{c ? <span className="text-muted-foreground"> — {c}</span> : null}</span>
          </div>
        ))}
      </div>
      <Button variant="brand" size="xl" className="mt-4 w-full" onClick={() => useGame.getState().setPanel(null)}>Let's open shop!</Button>
    </Shell>
  );
}

function LeaderboardPanel() {
  return (
    <Shell title="Global leaderboard">
      <LeaderboardTable />
    </Shell>
  );
}

export function Panels() {
  const panel = useGame((s) => s.panel);
  switch (panel) {
    case "computer":
      return <ComputerPanel />;
    case "unload":
      return <UnloadPanel />;
    case "warehouse":
      return <WarehousePanel />;
    case "report":
      return <ReportPanel />;
    case "menu":
      return <MenuPanel />;
    case "help":
      return <HelpPanel />;
    case "leaderboard":
      return <LeaderboardPanel />;
    default:
      return null;
  }
}
