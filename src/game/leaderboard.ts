import { supabase } from "@/integrations/supabase/client";
import type { GameState } from "./sim/types";

export interface LeaderRow {
  id: string;
  name: string;
  level: number;
  earnings: number;
  products_sold: number;
}

export async function fetchLeaderboard(): Promise<LeaderRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, name, level, earnings, products_sold")
    .order("earnings", { ascending: false })
    .limit(100);
  if (error) throw new Error("Leaderboard is unavailable right now");
  return (data ?? []) as LeaderRow[];
}

let lastSent = "";
export async function submitScore(s: GameState) {
  const key = `${s.playerName}|${s.level}|${Math.round(s.totals.revenue)}|${s.totals.sold}`;
  if (key === lastSent) return;
  const { error } = await supabase.rpc("submit_score", {
    p_id: s.playerId,
    p_secret: s.secret,
    p_name: s.playerName,
    p_level: s.level,
    p_earnings: Math.round(s.totals.revenue),
    p_sold: s.totals.sold,
  });
  if (!error) lastSent = key;
}
