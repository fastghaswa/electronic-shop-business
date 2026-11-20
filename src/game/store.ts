import { create } from "zustand";
import type { GameState } from "./sim/types";
import { newGame, type Result } from "./sim/economy";

export type Panel = null | "computer" | "unload" | "warehouse" | "report" | "leaderboard" | "menu" | "help";
export type CameraMode = "first" | "third";

export interface Toast { id: number; text: string; tone: "good" | "bad" | "info" }

interface Store {
  game: GameState | null;
  screen: "start" | "playing";
  panel: Panel;
  camera: CameraMode;
  arrange: boolean;
  carriedId: string | null;
  carryRot: number;
  prompt: string | null;
  toasts: Toast[];
  queueLen: number;
  crowd: { id: number; model: number }[];
  setCrowd: (c: { id: number; model: number }[]) => void;
  startNew: (name: string) => void;
  continueGame: () => void;
  quitToMenu: () => void;
  setGame: (fn: (g: GameState) => GameState) => void;
  /** Run an economy action and toast its result. */
  act: (fn: (g: GameState) => Result) => boolean;
  setPanel: (p: Panel) => void;
  toggleCamera: () => void;
  setArrange: (v: boolean) => void;
  setCarry: (id: string | null, rot?: number) => void;
  setPrompt: (p: string | null) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}

export const SAVE_KEY = "ghaswa-electronic-save-v1";

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (g.version !== 1) return null;
    // vans mid-drive resume sensibly
    if (g.delivery.phase === "arriving") g.delivery = { ...g.delivery, phase: "parked", timer: 0 };
    if (g.delivery.phase === "leaving") g.delivery = { phase: "none", items: {}, timer: 0 };
    return g;
  } catch {
    return null;
  }
}

export function writeSave(g: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(g));
  } catch {
    /* storage full or blocked */
  }
}

let toastId = 1;

export const useGame = create<Store>((set, get) => ({
  game: null,
  screen: "start",
  panel: null,
  camera: "first",
  arrange: false,
  carriedId: null,
  carryRot: 0,
  prompt: null,
  toasts: [],
  queueLen: 0,
  crowd: [],
  setCrowd: (c) => set({ crowd: c }),
  startNew: (name) => {
    const g = newGame(name);
    writeSave(g);
    set({ game: g, screen: "playing", panel: "help", arrange: false, carriedId: null });
  },
  continueGame: () => {
    const g = loadSave();
    if (g) set({ game: g, screen: "playing", panel: null, arrange: false, carriedId: null });
  },
  quitToMenu: () => {
    const g = get().game;
    if (g) writeSave(g);
    set({ screen: "start", panel: null, arrange: false, carriedId: null });
  },
  setGame: (fn) => {
    const g = get().game;
    if (!g) return;
    set({ game: fn(g) });
  },
  act: (fn) => {
    const g = get().game;
    if (!g) return false;
    const r = fn(g);
    if (r.ok) {
      set({ game: r.state });
      if (r.msg) get().toast(r.msg, "good");
      return true;
    }
    get().toast(r.error, "bad");
    return false;
  },
  setPanel: (p) => {
    if (p && document.pointerLockElement) document.exitPointerLock();
    set({ panel: p });
  },
  toggleCamera: () => set((s) => ({ camera: s.camera === "first" ? "third" : "first" })),
  setArrange: (v) => set({ arrange: v, carriedId: v ? get().carriedId : null }),
  setCarry: (id, rot) => set({ carriedId: id, carryRot: rot ?? get().carryRot }),
  setPrompt: (p) => {
    if (get().prompt !== p) set({ prompt: p });
  },
  toast: (text, tone = "info") => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
}));

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __game: unknown }).__game = { store: useGame };
}
