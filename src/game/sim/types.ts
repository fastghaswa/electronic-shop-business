export type WorkerRole = "cashier" | "salesman" | "stocker" | "warehouseManager" | "delivery";

export interface Display {
  id: string;
  kind: "product" | "decor";
  /** productId for kind=product, decorId for kind=decor */
  ref: string;
  x: number;
  z: number;
  /** rotation in quarter turns (0..3); 0 faces +z (towards the shop front) */
  rot: number;
}

export interface DayStats {
  day: number;
  revenue: number;
  cogs: number;
  purchases: number;
  salaries: number;
  rent: number;
  upgrades: number;
  sold: number;
  customers: number;
  lost: number;
}

export type DeliveryPhase = "none" | "enroute" | "arriving" | "parked" | "leaving";

export interface Delivery {
  phase: DeliveryPhase;
  items: Record<string, number>;
  /** seconds left in current timed phase */
  timer: number;
}

export interface GameState {
  version: 1;
  playerId: string;
  secret: string;
  playerName: string;
  money: number;
  level: number;
  xp: number;
  day: number;
  /** minutes since midnight */
  clock: number;
  open: boolean;
  dayEnded: boolean;
  shopLevel: number;
  warehouseLevel: number;
  shopStock: Record<string, number>;
  warehouseStock: Record<string, number>;
  displays: Display[];
  workers: Record<WorkerRole, boolean>;
  delivery: Delivery;
  orderQueue: Record<string, number>;
  today: DayStats;
  history: DayStats[];
  totals: { revenue: number; profit: number; sold: number };
}
