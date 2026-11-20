import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGame, loadSave } from "./store";
import { runtime, resetRuntime } from "./runtime";
import { newGame } from "./sim/economy";
import { closeShop, openShop, rotateCarry } from "./actions";
import { Buildings, Ground, Lighting, Traffic } from "./scene/World";
import { Displays } from "./scene/Displays";
import { Customers, PlayerAvatar, Van, Workers } from "./scene/Actors";
import { Stepper } from "./scene/Stepper";
import { Hud } from "./ui/Hud";
import { Panels } from "./ui/Panels";
import { StartScreen } from "./ui/StartScreen";
import { shopRect } from "./sim/layout";

function ReadySignal() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-game-root]");
    const id = requestAnimationFrame(() => {
      if (el) el.dataset["sceneReady"] = "1";
      runtime.sceneReady = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

/** Slow orbit behind the title screen. */
function AttractCamera() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (useGame.getState().screen !== "start") return;
    const t = clock.getElapsedTime() * 0.08;
    const s = shopRect(useGame.getState().game?.shopLevel ?? 1);
    camera.position.set(Math.sin(t) * 24 + 6, 9, s.maxZ + 16 + Math.cos(t) * 4);
    camera.lookAt(4, 1.5, 0);
  });
  return null;
}

function useInput(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const st = useGame.getState();
      if (st.screen !== "playing") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") {
        if (st.panel) st.setPanel(null);
        else if (st.carriedId) st.setCarry(null);
        else if (st.arrange) st.setArrange(false);
        return;
      }
      if (st.panel) return;
      runtime.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") runtime.interaction?.run();
      else if (e.code === "KeyR") rotateCarry();
      else if (e.code === "KeyV") st.toggleCamera();
      else if (e.code === "KeyB") st.setArrange(!st.arrange);
      else if (e.code === "KeyM" || e.code === "Tab") st.setPanel("menu");
      else if (e.code === "KeyL") st.setPanel("leaderboard");
      else if (e.code === "KeyO") {
        const g = st.game;
        if (g && !g.dayEnded) (g.open ? closeShop : openShop)();
      }
    };
    const up = (e: KeyboardEvent) => runtime.keys.delete(e.code);
    const blur = () => runtime.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    const el = rootRef.current?.querySelector("canvas");
    let drag: { id: number; x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => {
      if (useGame.getState().screen !== "playing" || useGame.getState().panel) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (e.pointerType === "mouse" && !document.pointerLockElement) {
        try {
          const r = (el as HTMLCanvasElement | null)?.requestPointerLock?.() as unknown;
          if (r && typeof (r as Promise<void>).catch === "function") (r as Promise<void>).catch(() => {});
        } catch {
          /* pointer lock unavailable (e.g. iframe) — drag-to-look still works */
        }
      }
    };
    const pm = (e: PointerEvent) => {
      if (document.pointerLockElement === el) {
        runtime.look.dx += e.movementX;
        runtime.look.dy += e.movementY;
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      const mult = e.pointerType === "touch" ? 1.6 : 1;
      runtime.look.dx += (e.clientX - drag.x) * mult;
      runtime.look.dy += (e.clientY - drag.y) * mult;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pu = (e: PointerEvent) => {
      if (drag && drag.id === e.pointerId) drag = null;
    };
    el?.addEventListener("pointerdown", pd as EventListener);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el?.removeEventListener("pointerdown", pd as EventListener);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
    };
  }, [rootRef]);
}

export default function GameCanvas() {
  const root = useRef<HTMLDivElement>(null);
  const screen = useGame((s) => s.screen);
  useEffect(() => {
    // Show the saved shop (or a fresh one) behind the title screen.
    if (!useGame.getState().game) useGame.setState({ game: loadSave() ?? newGame("Preview") });
  }, []);
  useEffect(() => {
    if (screen === "playing") {
      resetRuntime();
      const g = useGame.getState().game;
      if (g) runtime.player.z = shopRect(g.shopLevel).maxZ - 2;
    }
  }, [screen]);
  useInput(root);
  return (
    <div ref={root} data-game-root className="fixed inset-0 select-none overflow-hidden bg-background touch-none">
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 70, near: 0.05, far: 320, position: [10, 9, 25] }} gl={{ antialias: true }}>
        <Lighting />
        <Ground />
        <Buildings />
        <Suspense fallback={null}>
          <Displays />
          <Van />
          <Traffic />
          <Workers />
          <Customers />
          <PlayerAvatar />
          <ReadySignal />
        </Suspense>
        <Stepper />
        <AttractCamera />
      </Canvas>
      {screen === "playing" ? (
        <>
          <Hud />
          <Panels />
        </>
      ) : (
        <StartScreen />
      )}
    </div>
  );
}
