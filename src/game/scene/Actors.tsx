import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { runtime } from "../runtime";
import { Character, CUSTOMER_MODELS, type CharPose } from "./Characters";
import { StaticModel } from "./Models";
import { boxTex } from "./textures";
import {
  cashierSpot, shopRect, vanParkPos, vanUnloadPos, viewSpot, warehouseRect, warehouseTerminalPos,
} from "../sim/layout";
import { VAN_DRIVE_TIME } from "../sim/economy";
import type { WorkerRole } from "../sim/types";

export function Customers() {
  const crowd = useGame((s) => s.crowd);
  return (
    <group>
      {crowd.map((c) => (
        <Suspense key={c.id} fallback={null}>
          <Character
            model={CUSTOMER_MODELS[c.model % CUSTOMER_MODELS.length]!}
            pose={() => {
              const cu = runtime.customers.customers.find((x) => x.id === c.id);
              if (!cu) return { x: 0, z: 0, yaw: 0, walking: false, visible: false };
              return { x: cu.x, z: cu.z, yaw: cu.yaw, walking: cu.walking, carrying: cu.carrying, mood: cu.moodTimer > 0 ? cu.mood : null };
            }}
          />
        </Suspense>
      ))}
    </group>
  );
}

export function PlayerAvatar() {
  const camera = useGame((s) => s.camera);
  const carrying = useGame((s) => !!s.carriedId);
  if (camera !== "third") return null;
  return (
    <Suspense fallback={null}>
      <Character
        model="character-male-c"
        pose={() => ({ x: runtime.player.x, z: runtime.player.z, yaw: runtime.player.yaw + Math.PI, walking: runtime.player.moving, carrying })}
      />
    </Suspense>
  );
}

type Pt = { x: number; z: number };
function useWander(points: () => Pt[], pause = 2.5, speed = 1.3) {
  const st = useRef({ x: 0, z: 0, yaw: 0, target: null as Pt | null, wait: 0, init: false, walking: false });
  return (dt: number): CharPose => {
    const s = st.current;
    const pts = points();
    if (!s.init && pts[0]) {
      s.x = pts[0].x;
      s.z = pts[0].z;
      s.init = true;
    }
    if (!s.target) {
      s.wait -= dt;
      s.walking = false;
      if (s.wait <= 0 && pts.length) s.target = pts[Math.floor(Math.random() * pts.length)]!;
    } else {
      const dx = s.target.x - s.x;
      const dz = s.target.z - s.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        s.target = null;
        s.wait = pause * (0.6 + Math.random());
      } else {
        const step = Math.min(d, speed * dt);
        s.x += (dx / d) * step;
        s.z += (dz / d) * step;
        s.yaw = Math.atan2(dx, dz);
        s.walking = true;
      }
    }
    return { x: s.x, z: s.z, yaw: s.yaw, walking: s.walking };
  };
}

function Worker({ role }: { role: WorkerRole }) {
  const pose = useRef<CharPose>({ x: 0, z: 0, yaw: 0, walking: false });
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const whLevel = useGame((s) => s.game?.warehouseLevel ?? 1);
  const wander = useWander(() => {
    const g = useGame.getState().game;
    if (!g) return [];
    const s = shopRect(shopLevel);
    const w = warehouseRect(shopLevel, whLevel);
    switch (role) {
      case "salesman": {
        const v = g.displays.filter((d) => d.kind === "product").map(viewSpot);
        return v.length ? v : [{ x: 0, z: 0 }];
      }
      case "stocker": {
        const v = g.displays.filter((d) => d.kind === "product").slice(0, 6).map(viewSpot);
        return [warehouseTerminalPos(shopLevel, whLevel), { x: s.maxX - 1.2, z: s.minZ + 2.5 }, ...v];
      }
      case "warehouseManager":
        return [
          { x: w.minX + 2, z: w.minZ + 3 },
          { x: (w.minX + w.maxX) / 2, z: (w.minZ + w.maxZ) / 2 },
          { x: w.maxX - 2, z: w.maxZ - 2.5 },
        ];
      case "delivery": {
        const u = vanUnloadPos(shopLevel);
        return g.delivery.phase === "parked" ? [u, { x: u.x - 1, z: u.z - 0.5 }] : [{ x: w.minX + 4.2, z: w.maxZ + 1.2 }, { x: w.minX + 2.5, z: w.maxZ + 2 }];
      }
      default:
        return [cashierSpot(shopLevel)];
    }
  }, role === "salesman" ? 4 : 2.5);
  useFrame((_, d) => {
    const dt = Math.min(d, 0.05);
    if (role === "cashier") {
      const c = cashierSpot(shopLevel);
      pose.current = { x: c.x, z: c.z, yaw: Math.PI / 2, walking: false };
    } else {
      pose.current = wander(dt);
      if (role === "stocker") pose.current.carrying = pose.current.walking;
    }
  });
  const model = role === "cashier" ? "character-female-c" : role === "salesman" ? "character-male-d" : "character-worker";
  return <Character model={model} pose={() => pose.current} tint={undefined} />;
}

export function Workers() {
  const workers = useGame((s) => s.game?.workers);
  if (!workers) return null;
  return (
    <group>
      {(Object.keys(workers) as WorkerRole[]).filter((r) => workers[r]).map((r) => (
        <Suspense key={r} fallback={null}>
          <Worker role={r} />
        </Suspense>
      ))}
    </group>
  );
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export function Van() {
  const group = useRef<THREE.Group>(null);
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const items = useGame((s) => s.game?.delivery.items ?? {});
  const phase = useGame((s) => s.game?.delivery.phase ?? "none");
  const boxCount = Math.min(10, Object.values(items).reduce((a, b) => a + b, 0));
  const boxMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boxTex(), roughness: 0.85 }), []);
  useFrame((_, d) => {
    const g = group.current;
    if (!g) return;
    const ph = useGame.getState().game?.delivery.phase ?? "none";
    if (ph !== runtime.vanPhase) {
      runtime.vanPhase = ph;
      runtime.vanT = 0;
    }
    runtime.vanT += Math.min(d, 0.05);
    const park = vanParkPos(shopLevel);
    let x = -90;
    if (ph === "arriving") x = -70 + (park.x + 70) * ease(Math.min(1, runtime.vanT / VAN_DRIVE_TIME));
    else if (ph === "parked") x = park.x;
    else if (ph === "leaving") {
      const t = Math.min(1, runtime.vanT / VAN_DRIVE_TIME);
      x = park.x + (95 - park.x) * t * t;
    }
    g.visible = ph === "arriving" || ph === "parked" || ph === "leaving";
    g.position.set(x, 0, park.z);
    runtime.van.x = x;
    runtime.van.z = park.z;
  });
  const u = vanUnloadPos(shopLevel);
  const park = vanParkPos(shopLevel);
  return (
    <group>
      <group ref={group} rotation-y={Math.PI / 2}>
        <Suspense fallback={null}>
          <StaticModel name="delivery" size={5.2} />
        </Suspense>
      </group>
      {phase === "parked" && (
        <group position={[u.x + 0.4, 0, u.z + 0.2]}>
          {Array.from({ length: boxCount }).map((_, i) => (
            <mesh key={i} material={boxMat} castShadow position={[(i % 3) * 0.55 - 0.55, 0.25 + Math.floor(i / 3) * 0.5, (i % 2) * 0.1]}>
              <boxGeometry args={[0.5, 0.48, 0.5]} />
            </mesh>
          ))}
        </group>
      )}
      {phase === "parked" && <UnloadMarker x={park.x - 3.6} z={park.z - 1.4} />}
    </group>
  );
}

function UnloadMarker({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 2.2 + Math.sin(clock.getElapsedTime() * 3) * 0.12;
  });
  return (
    <mesh ref={ref} position={[x, 2.2, z]} rotation-x={Math.PI}>
      <coneGeometry args={[0.22, 0.45, 4]} />
      <meshStandardMaterial color="#f6c453" emissive="#f6c453" emissiveIntensity={1.2} />
    </mesh>
  );
}
