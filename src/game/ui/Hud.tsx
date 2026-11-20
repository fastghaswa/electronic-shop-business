import { useEffect, useRef, useState } from "react";
import { Camera, Menu, Move, RotateCw, Trophy, Truck, Users, X, Check, Trash2, Store, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "../store";
import { runtime } from "../runtime";
import { closeShop, openShop, placeCarried, rotateCarry } from "../actions";
import { formatClock, formatMoney, removeDisplay, xpForNext } from "../sim/economy";
import { cn } from "@/lib/utils";

function useCoarse() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(pointer: coarse)");
    setCoarse(m.matches || "ontouchstart" in window);
    const f = () => setCoarse(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return coarse;
}

function TopBar() {
  const g = useGame((s) => s.game)!;
  const setPanel = useGame((s) => s.setPanel);
  const toggleCamera = useGame((s) => s.toggleCamera);
  const camera = useGame((s) => s.camera);
  const arrange = useGame((s) => s.arrange);
  const setArrange = useGame((s) => s.setArrange);
  const need = xpForNext(g.level);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-2 sm:p-3">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <div className="hud-chip rounded-xl px-3 py-2">
          <div className="font-display text-sm font-extrabold leading-none tracking-wide text-brand sm:text-base">GHASWA ELECTRONIC</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
            <span>Day {g.day}</span>
            <span>•</span>
            <span className="tabular-nums">{formatClock(g.clock)}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", g.open ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
              {g.open ? "OPEN" : g.dayEnded ? "DAY OVER" : "CLOSED"}
            </span>
          </div>
        </div>
        <div className="hud-chip rounded-xl px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</div>
          <div className={cn("font-display text-lg font-bold leading-none tabular-nums", g.money < 0 ? "text-destructive" : "text-primary")}>{formatMoney(g.money)}</div>
        </div>
        <div className="hud-chip w-32 rounded-xl px-3 py-2 sm:w-40">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Level {g.level}</span>
            <span className="tabular-nums">{g.xp}/{need} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (g.xp / need) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="pointer-events-auto flex items-center gap-1.5">
        {g.dayEnded ? (
          <Button variant="brand" onClick={() => setPanel("report")}>Day report</Button>
        ) : g.open ? (
          <Button variant="destructive" onClick={closeShop}><Store /> Close shop</Button>
        ) : (
          <Button variant="success" onClick={openShop}><Store /> Open shop</Button>
        )}
        <Button variant="hud" size="icon" title="Arrange shop (B)" aria-label="Arrange shop" onClick={() => setArrange(!arrange)} className={cn(arrange && "bg-primary text-primary-foreground")}><Move /></Button>
        <Button variant="hud" size="icon" title="Switch camera (V)" aria-label="Switch camera" onClick={toggleCamera}>{camera === "first" ? <Camera /> : <Users />}</Button>
        <Button variant="hud" size="icon" title="Leaderboard (L)" aria-label="Leaderboard" onClick={() => setPanel("leaderboard")}><Trophy /></Button>
        <Button variant="hud" size="icon" title="Menu (M)" aria-label="Menu" onClick={() => setPanel("menu")}><Menu /></Button>
      </div>
    </div>
  );
}

function StatusLine() {
  const g = useGame((s) => s.game)!;
  const queueLen = useGame((s) => s.queueLen);
  const items: string[] = [];
  const d = g.delivery;
  const units = Object.values(d.items).reduce((a, b) => a + b, 0);
  if (d.phase === "enroute") items.push(`🚚 Van arriving in ${Math.ceil(d.timer)}s (${units} items)`);
  if (d.phase === "arriving") items.push("🚚 Van pulling up outside…");
  if (d.phase === "parked") items.push(`🚚 Van parked outside — unload ${units} items`);
  if (queueLen > 0 && !g.workers.cashier) items.push(`🧾 ${queueLen} customer${queueLen > 1 ? "s" : ""} waiting at the counter`);
  if (!g.open && !g.dayEnded && g.displays.every((x) => x.kind !== "product")) items.push("💡 Use the counter computer to order stock");
  if (!items.length) return null;
  return (
    <div className="pointer-events-none absolute left-2 top-[92px] flex flex-col gap-1 sm:left-3 sm:top-[72px]">
      {items.map((t) => (
        <div key={t} className="hud-chip w-fit rounded-lg px-2.5 py-1 text-xs">{t}</div>
      ))}
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex flex-col items-center gap-1.5 px-4 sm:top-20">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "animate-toast max-w-md rounded-lg px-3 py-1.5 text-center text-sm font-medium shadow-panel",
            t.tone === "good" && "bg-success text-success-foreground",
            t.tone === "bad" && "bg-destructive text-destructive-foreground",
            t.tone === "info" && "hud-chip text-foreground",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Prompt({ coarse }: { coarse: boolean }) {
  const prompt = useGame((s) => s.prompt);
  if (!prompt) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center sm:bottom-16">
      <button
        className="animate-prompt pointer-events-auto flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-semibold text-primary-foreground"
        onClick={() => runtime.interaction?.run()}
      >
        {!coarse && <kbd className="rounded bg-background/30 px-1.5 text-xs">E</kbd>}
        {coarse && <Hand className="size-4" />}
        {prompt}
      </button>
    </div>
  );
}

function ArrangeBar() {
  const arrange = useGame((s) => s.arrange);
  const carriedId = useGame((s) => s.carriedId);
  const setCarry = useGame((s) => s.setCarry);
  const setArrange = useGame((s) => s.setArrange);
  const act = useGame((s) => s.act);
  if (!arrange) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-44 flex justify-center px-2 sm:bottom-28">
      <div className="hud-chip pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl p-1.5 text-xs">
        <span className="px-2 font-semibold text-primary">ARRANGE MODE</span>
        {carriedId ? (
          <>
            <Button size="sm" variant="secondary" onClick={rotateCarry}><RotateCw /> Rotate (R)</Button>
            <Button size="sm" variant="success" onClick={placeCarried}><Check /> Place</Button>
            <Button size="sm" variant="secondary" onClick={() => setCarry(null)}><X /> Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (act((g) => removeDisplay(g, carriedId))) setCarry(null);
              }}
            >
              <Trash2 /> Remove
            </Button>
          </>
        ) : (
          <span className="px-1 text-muted-foreground">Look at an item and press E to pick it up</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setArrange(false)}>Done</Button>
      </div>
    </div>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 48;
  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    runtime.joy.x = dx / R;
    runtime.joy.y = dy / R;
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    runtime.joy.x = 0;
    runtime.joy.y = 0;
  };
  return (
    <div
      ref={base}
      className="hud-chip absolute bottom-6 left-6 size-32 touch-none rounded-full"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute left-1/2 top-1/2 size-14 rounded-full bg-primary/80 shadow-glow" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

function MobileButtons() {
  const toggleCamera = useGame((s) => s.toggleCamera);
  const arrange = useGame((s) => s.arrange);
  const setArrange = useGame((s) => s.setArrange);
  const carriedId = useGame((s) => s.carriedId);
  const prompt = useGame((s) => s.prompt);
  return (
    <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {carriedId && <Button variant="hud" size="touch" onClick={rotateCarry}><RotateCw /></Button>}
        <Button variant="hud" size="touch" onClick={toggleCamera}><Camera /></Button>
        <Button variant="hud" size="touch" onClick={() => setArrange(!arrange)} className={cn(arrange && "bg-primary text-primary-foreground")}><Move /></Button>
      </div>
      <Button variant="brand" size="touch" className="size-20" disabled={!prompt} onClick={() => runtime.interaction?.run()}>
        <Hand className="!size-7" />
      </Button>
    </div>
  );
}

export function Hud() {
  const coarse = useCoarse();
  const camera = useGame((s) => s.camera);
  const panel = useGame((s) => s.panel);
  const delivery = useGame((s) => s.game?.delivery.phase);
  return (
    <div className="pointer-events-none absolute inset-0">
      <TopBar />
      <StatusLine />
      <Toasts />
      {!panel && camera === "first" && (
        <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 ring-2 ring-background/40" />
      )}
      <div className="pointer-events-auto">
        <Prompt coarse={coarse} />
        <ArrangeBar />
        {coarse && !panel && (
          <>
            <Joystick />
            <MobileButtons />
          </>
        )}
      </div>
      {!coarse && !panel && (
        <div className="hud-chip absolute bottom-3 left-3 hidden rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground md:block">
          WASD move • Mouse look (click) • Shift run • E interact • B arrange • V camera • O open/close • M menu
          {delivery === "parked" && <span className="ml-2 text-primary"><Truck className="inline size-3" /> Van outside</span>}
        </div>
      )}
    </div>
  );
}
