import { useEffect, useState } from "react";
import { Play, RotateCcw, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame, loadSave } from "../store";
import { formatMoney } from "../sim/economy";
import type { GameState } from "../sim/types";
import { LeaderboardTable } from "./Leaderboard";

export function StartScreen() {
  const startNew = useGame((s) => s.startNew);
  const continueGame = useGame((s) => s.continueGame);
  const [save, setSave] = useState<GameState | null>(null);
  const [name, setName] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const [board, setBoard] = useState(false);
  useEffect(() => {
    const s = loadSave();
    setSave(s);
    if (s) setName(s.playerName);
  }, []);

  return (
    <div className="bg-night absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand shadow-glow">
            <Zap className="size-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">GHASWA ELECTRONIC</h1>
          <p className="mt-2 text-sm text-muted-foreground">Build a tiny gadget shop into the city's grandest electronics showroom.</p>
        </div>

        {board ? (
          <div className="mt-6">
            <LeaderboardTable />
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setBoard(false)}>Back</Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {save && !confirmNew && (
              <Button variant="brand" size="xl" className="w-full" onClick={continueGame}>
                <Play /> Continue — Day {save.day}, Level {save.level}, {formatMoney(save.money)}
              </Button>
            )}
            {(!save || confirmNew) && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  startNew(name || "Shopkeeper");
                }}
              >
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="pname">Your shopkeeper name</label>
                <Input id="pname" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ghaswa Bhai" className="h-11 bg-secondary" autoFocus />
                {confirmNew && save && <p className="text-xs text-destructive">Starting over replaces your saved shop.</p>}
                <Button type="submit" variant="brand" size="xl" className="w-full"><Play /> Start new shop with ₹10,000</Button>
                {confirmNew && <Button type="button" variant="ghost" className="w-full" onClick={() => setConfirmNew(false)}>Cancel</Button>}
              </form>
            )}
            {save && !confirmNew && (
              <Button variant="secondary" className="w-full" onClick={() => setConfirmNew(true)}><RotateCcw /> New game</Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setBoard(true)}><Trophy /> Global leaderboard</Button>
            <p className="pt-2 text-center text-[11px] text-muted-foreground">Desktop: WASD + mouse • Mobile: joystick + drag to look. Progress saves automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
