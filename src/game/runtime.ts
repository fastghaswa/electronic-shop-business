// Per-frame mutable state that must never live in React state.
import { newCustomerWorld, type CustomerWorld } from "./sim/customers";

export interface Interaction {
  id: string;
  label: string;
  run: () => void;
}

export const runtime = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  player: { x: 0, z: 3, yaw: 0, pitch: -0.05, moving: false, speed: 0 },
  customers: newCustomerWorld() as CustomerWorld,
  carry: { x: 0, z: 0, valid: false },
  interaction: null as Interaction | null,
  timers: { spawn: 2, restock: 0, reorder: 0, autoUnload: 0, cashier: 0, save: 0, board: 20, clockAcc: 0 },
  van: { x: -80, z: 0, yaw: Math.PI / 2, wheel: 0 },
  sceneReady: false,
  highlightId: null as string | null,
  vanPhase: "none" as string,
  vanT: 0,
};

export function resetRuntime() {
  runtime.customers = newCustomerWorld();
  runtime.player.x = 0;
  runtime.player.z = 3;
  runtime.player.yaw = 0;
  runtime.player.pitch = -0.05;
  runtime.interaction = null;
  runtime.timers.spawn = 2;
}
