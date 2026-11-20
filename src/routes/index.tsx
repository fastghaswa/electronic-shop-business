import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameCanvas = lazy(() => import("@/game/GameCanvas"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GHASWA ELECTRONIC — 3D Electronics Shop Simulator" },
      { name: "description", content: "Run your own 3D electronics showroom: order stock, serve customers, hire workers, expand and top the global leaderboard." },
      { property: "og:title", content: "GHASWA ELECTRONIC — 3D Electronics Shop Simulator" },
      { property: "og:description", content: "Start with ₹10,000 and grow a small gadget shop into a giant electronics showroom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Suspense fallback={<Loading />}>
      <GameCanvas />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="bg-night fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
      <div className="font-display text-3xl font-extrabold text-brand">GHASWA ELECTRONIC</div>
      <div className="text-sm text-muted-foreground">Loading the showroom…</div>
    </div>
  );
}
