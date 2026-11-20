import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchLeaderboard, submitScore, type LeaderRow } from "../leaderboard";
import { useGame } from "../store";
import { formatMoney } from "../sim/economy";
import { cn } from "@/lib/utils";

export function LeaderboardTable() {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = useGame((s) => (s.screen === "playing" ? s.game?.playerId : undefined));
  const load = async () => {
    setError(null);
    setRows(null);
    try {
      const g = useGame.getState().game;
      if (g && useGame.getState().screen === "playing") await submitScore(g);
      setRows(await fetchLeaderboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the leaderboard");
      setRows([]);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Top 100 shopkeepers</h3>
        <Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw /> Refresh</Button>
      </div>
      <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Lvl</th>
              <th className="px-2 py-2 text-right">Earnings</th>
              <th className="px-2 py-2 text-right">Sold</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></td></tr>
            )}
            {rows?.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{error ?? "No players yet — be the first!"}</td></tr>
            )}
            {rows?.map((r, i) => (
              <tr key={r.id} className={cn("border-t border-border/60", r.id === me && "bg-primary/15 font-semibold")}>
                <td className={cn("px-2 py-1.5 tabular-nums", i < 3 && "text-primary font-bold")}>{i + 1}</td>
                <td className="max-w-[9rem] truncate px-2 py-1.5">{r.name}{r.id === me ? " (you)" : ""}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.level}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(r.earnings)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.products_sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Ranked by total sales earnings. Your score updates automatically as you play.</p>
    </div>
  );
}
