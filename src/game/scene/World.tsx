import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import { useGame } from "../store";
import {
  WALL_H, computerPos, counterPos, roadZ, shopRect, wallRects, warehouseRect, warehouseTerminalPos, type WallSeg,
} from "../sim/layout";
import { warehouseCapacity, warehouseUnits } from "../sim/economy";
import { StaticModel } from "./Models";
import { asphalt, boxTex, concrete, floorTiles, grass, metalSiding, plaster, signTex } from "./textures";

export function Lighting() {
  return (
    <>
      <Sky sunPosition={[60, 40, 30]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} />
      <fog attach="fog" args={["#cfdbe6", 60, 170]} />
      <hemisphereLight args={["#e8f1ff", "#8a7a63", 0.75]} />
      <directionalLight
        position={[30, 40, 25]}
        intensity={2.4}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
      />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={1.2} color="#ffe3b8" position={[-8, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1} color="#bcd8ff" position={[8, 2, 2]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
    </>
  );
}

function Wall({ r, mat, glassMat, frameMat }: { r: WallSeg; mat: THREE.Material; glassMat: THREE.Material; frameMat: THREE.Material }) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  if (r.glass) {
    return (
      <group position={[cx, 0, cz]}>
        <mesh position={[0, 0.25, 0]} material={frameMat} castShadow receiveShadow>
          <boxGeometry args={[w, 0.5, d]} />
        </mesh>
        <mesh position={[0, 1.85, 0]} material={glassMat}>
          <boxGeometry args={[w, 2.7, d * 0.3]} />
        </mesh>
        <mesh position={[0, 3.2 + (WALL_H - 3.2) / 2, 0]} material={mat} castShadow>
          <boxGeometry args={[w, WALL_H - 3.2, d]} />
        </mesh>
        {Array.from({ length: Math.max(1, Math.floor(w / 2.2)) + 1 }).map((_, i, arr) => (
          <mesh key={i} position={[-w / 2 + (i * w) / (arr.length - 1), 1.85, 0]} material={frameMat}>
            <boxGeometry args={[0.08, 2.7, d]} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <mesh position={[cx, WALL_H / 2, cz]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[w, WALL_H, d]} />
    </mesh>
  );
}

export function Buildings() {
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const whLevel = useGame((s) => s.game?.warehouseLevel ?? 1);
  const s = shopRect(shopLevel);
  const w = warehouseRect(shopLevel, whLevel);
  const walls = useMemo(() => wallRects(shopLevel, whLevel), [shopLevel, whLevel]);
  const mats = useMemo(() => {
    const shop = new THREE.MeshStandardMaterial({ map: plaster("#efe6d6"), roughness: 0.85 });
    const wh = new THREE.MeshStandardMaterial({ map: metalSiding(), roughness: 0.55, metalness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: "#bfe3f2", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 });
    const frame = new THREE.MeshStandardMaterial({ color: "#2b3440", roughness: 0.35, metalness: 0.7 });
    return { shop, wh, glass, frame };
  }, []);
  const shopW = s.maxX - s.minX;
  const shopD = s.maxZ - s.minZ;
  const whW = w.maxX - w.minX;
  const whD = w.maxZ - w.minZ;
  const tiles = useMemo(() => floorTiles([shopW / 2, shopD / 2]), [shopW, shopD]);
  const whFloor = useMemo(() => concrete([whW / 3, whD / 3], "#9c9890"), [whW, whD]);
  const sign = useMemo(() => signTex("GHASWA ELECTRONIC", "TVs • ACs • Fridges • Mobiles • Appliances"), []);
  const whSign = useMemo(() => signTex("WAREHOUSE", "Ghaswa Electronic Storage"), []);
  const lights = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = s.minX + 2.5; x < s.maxX - 1; x += 4) for (let z = s.minZ + 2; z < s.maxZ - 1; z += 3.5) out.push([x, z]);
    return out;
  }, [s.minX, s.maxX, s.minZ, s.maxZ]);
  const pointLights = useMemo(() => {
    const out: [number, number][] = [];
    const nx = Math.max(2, Math.round(shopW / 8));
    for (let i = 0; i < nx; i++) out.push([s.minX + ((i + 0.5) * shopW) / nx, 0]);
    return out;
  }, [s.minX, shopW]);

  return (
    <group>
      {/* shop floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, (s.minZ + s.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[shopW, shopD]} />
        <meshStandardMaterial map={tiles} roughness={0.18} metalness={0.05} />
      </mesh>
      {/* warehouse floor */}
      <mesh rotation-x={-Math.PI / 2} position={[(w.minX + w.maxX) / 2, 0.011, (w.minZ + w.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[whW, whD]} />
        <meshStandardMaterial map={whFloor} roughness={0.7} />
      </mesh>
      {/* passage between buildings */}
      <mesh rotation-x={-Math.PI / 2} position={[(s.maxX + w.minX) / 2, 0.012, s.minZ + 2.5]} receiveShadow>
        <planeGeometry args={[w.minX - s.maxX + 0.4, 2.4]} />
        <meshStandardMaterial color="#8d8a84" roughness={0.8} />
      </mesh>
      {walls.map((r, i) => {
        const isWh = r.minX >= w.minX - 0.2;
        return <Wall key={i} r={r} mat={isWh ? mats.wh : mats.shop} glassMat={mats.glass} frameMat={mats.frame} />;
      })}
      {/* roofs */}
      <mesh position={[0, WALL_H + 0.1, (s.minZ + s.maxZ) / 2]} receiveShadow>
        <boxGeometry args={[shopW + 0.6, 0.2, shopD + 0.6]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </mesh>
      <mesh position={[(w.minX + w.maxX) / 2, WALL_H + 0.1, (w.minZ + w.maxZ) / 2]}>
        <boxGeometry args={[whW + 0.6, 0.2, whD + 0.6]} />
        <meshStandardMaterial color="#6d757d" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* awning + sign */}
      <mesh position={[0, 3.35, s.maxZ + 0.9]} castShadow>
        <boxGeometry args={[shopW + 0.4, 0.1, 1.8]} />
        <meshStandardMaterial color="#c8432b" roughness={0.6} />
      </mesh>
      <mesh position={[0, WALL_H + 0.75, s.maxZ + 0.2]}>
        <planeGeometry args={[Math.min(12, shopW - 1), 2.2]} />
        <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[(w.minX + w.maxX) / 2, WALL_H - 0.5, w.maxZ + 0.17]}>
        <planeGeometry args={[Math.min(6, whW - 1), 1.1]} />
        <meshStandardMaterial map={whSign} roughness={0.5} />
      </mesh>
      {/* raised shutter over warehouse door */}
      <mesh position={[w.minX + 4.2, 3.6, w.maxZ + 0.2]}>
        <boxGeometry args={[3.2, 0.8, 0.3]} />
        <meshStandardMaterial map={metalSiding()} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* ceiling light panels */}
      {lights.map(([x, z], i) => (
        <mesh key={i} position={[x, WALL_H - 0.005, z]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[1.2, 0.6]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff6e8" emissiveIntensity={2} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {pointLights.map(([x], i) => (
        <pointLight key={i} position={[x, 3.6, (s.minZ + s.maxZ) / 2]} intensity={18} distance={16} decay={1.4} color="#fff3e2" />
      ))}
      <pointLight position={[(w.minX + w.maxX) / 2, 3.6, (w.minZ + w.maxZ) / 2]} intensity={14} distance={14} decay={1.4} color="#eef4ff" />
      <Counter />
      <Warehouse />
    </group>
  );
}

function Counter() {
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const c = counterPos(shopLevel);
  const pc = computerPos(shopLevel);
  return (
    <group>
      <group position={[c.x, 0, c.z]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1, c.len]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.55} />
        </mesh>
        <mesh position={[0.41, 0.5, 0]}>
          <boxGeometry args={[0.02, 0.7, c.len * 0.9]} />
          <meshStandardMaterial color="#f2b33d" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.02, 0]} castShadow>
          <boxGeometry args={[0.9, 0.04, c.len + 0.1]} />
          <meshStandardMaterial color="#1d232b" roughness={0.15} metalness={0.4} />
        </mesh>
        {/* cash drawer */}
        <mesh position={[0, 1.1, 0.9]} castShadow>
          <boxGeometry args={[0.4, 0.12, 0.35]} />
          <meshStandardMaterial color="#2d3436" roughness={0.4} />
        </mesh>
      </group>
      <group position={[pc.x + 0.2, 1.04, pc.z]} rotation-y={-Math.PI / 2}>
        <StaticModel name="computerScreen" size={0.55} />
        <group position={[0, 0, 0.3]}>
          <StaticModel name="computerKeyboard" size={0.42} />
        </group>
        <group position={[0.3, 0, 0.3]}>
          <StaticModel name="computerMouse" size={0.1} />
        </group>
      </group>
      {/* glowing ring hint over the computer */}
      <PulseRing x={pc.x - 0.7} z={pc.z} />
    </group>
  );
}

export function PulseRing({ x, z, color = "#f6c453" }: { x: number; z: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 3) * 0.08;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={[x, 0.03, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.45, 0.55, 40]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={0.8} />
    </mesh>
  );
}

function Rack({ x, z, rotY, fill }: { x: number; z: number; rotY: number; fill: number }) {
  const L = 2.4;
  const D = 0.8;
  const levels = [0.15, 0.95, 1.75];
  const slots = levels.length * 4;
  const filled = Math.round(fill * slots);
  const boxMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boxTex(), roughness: 0.85 }), []);
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * L) / 2, 1.3, (sz * D) / 2]} castShadow>
            <boxGeometry args={[0.06, 2.6, 0.06]} />
            <meshStandardMaterial color="#1f5fa8" metalness={0.6} roughness={0.4} />
          </mesh>
        )),
      )}
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[L, 0.04, D]} />
          <meshStandardMaterial color="#f08a24" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: filled }).map((_, i) => {
        const lv = Math.floor(i / 4);
        const slot = i % 4;
        return (
          <mesh key={i} position={[-L / 2 + 0.3 + slot * 0.6, levels[lv]! + 0.27, 0]} material={boxMat} castShadow>
            <boxGeometry args={[0.52, 0.5, 0.6]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Warehouse() {
  const game = useGame((s) => s.game);
  const shopLevel = game?.shopLevel ?? 1;
  const whLevel = game?.warehouseLevel ?? 1;
  const w = warehouseRect(shopLevel, whLevel);
  const fill = game ? warehouseUnits(game) / Math.max(1, warehouseCapacity(game)) : 0;
  const t = warehouseTerminalPos(shopLevel, whLevel);
  const racks: { x: number; z: number; r: number }[] = [];
  for (let x = w.minX + 1.6; x + 1.2 < w.maxX - 0.4; x += 2.7) racks.push({ x: x + 1.2 - 0.4, z: w.minZ + 0.7, r: 0 });
  for (let z = w.minZ + 3.4; z + 1.2 < w.maxZ - 1.5; z += 2.7) racks.push({ x: w.maxX - 0.7, z: z + 0.8, r: Math.PI / 2 });
  const perRack = racks.length ? fill : 0;
  return (
    <group>
      {racks.map((r, i) => (
        <Rack key={i} x={r.x} z={r.z} rotY={r.r} fill={Math.min(1, Math.max(0, perRack * racks.length - i))} />
      ))}
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.7, 1, 0.5]} />
          <meshStandardMaterial color="#3a4450" metalness={0.5} roughness={0.4} />
        </mesh>
        <group position={[0, 1, 0]} rotation-y={Math.PI}>
          <StaticModel name="computerScreen" size={0.5} />
        </group>
      </group>
      <PulseRing x={t.x} z={t.z - 0.9} color="#4fc3f7" />
      {/* pallets of boxes near the door */}
      <group position={[w.minX + 1.2, 0, w.minZ + 4.2]}>
        <StaticModel name="cardboardBoxClosed" size={0.7} />
      </group>
    </group>
  );
}

export function Ground() {
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const s = shopRect(shopLevel);
  const rz = roadZ(shopLevel);
  const grassTex = useMemo(() => grass([60, 40]), []);
  const road = useMemo(() => asphalt([16, 1]), []);
  const walk = useMemo(() => concrete([60, 2], "#b9b4aa"), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 180]} />
        <meshStandardMaterial map={grassTex} roughness={1} />
      </mesh>
      {/* sidewalk */}
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.005, s.maxZ + 2.5]} receiveShadow>
        <planeGeometry args={[200, 5]} />
        <meshStandardMaterial map={walk} roughness={0.9} />
      </mesh>
      {/* plaza around buildings */}
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.004, (s.minZ + s.maxZ) / 2 - 1]} receiveShadow>
        <planeGeometry args={[s.maxX - s.minX + 40, s.maxZ - s.minZ + 4]} />
        <meshStandardMaterial map={walk} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.006, rz]} receiveShadow>
        <planeGeometry args={[200, 7]} />
        <meshStandardMaterial map={road} roughness={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.005, rz + 5.5]} receiveShadow>
        <planeGeometry args={[200, 4]} />
        <meshStandardMaterial map={walk} roughness={0.9} />
      </mesh>
      <Neighborhood rz={rz} backZ={s.minZ} />
    </group>
  );
}

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 2.4, 8]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#4f7d3a" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.5, 3.6, 0.3]} castShadow>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#5f8f44" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

const NEIGHBOR_COLORS = ["#d9c7a8", "#b7c4cf", "#e3b9a0", "#c8d3b4", "#d4b6c4", "#a9b8c9"];
function Neighborhood({ rz, backZ }: { rz: number; backZ: number }) {
  const blocks = useMemo(() => {
    const out: { x: number; w: number; h: number; d: number; c: string }[] = [];
    let x = -60;
    let i = 0;
    while (x < 90) {
      const w = 8 + ((i * 7) % 6);
      out.push({ x: x + w / 2, w, h: 6 + ((i * 5) % 9), d: 10, c: NEIGHBOR_COLORS[i % NEIGHBOR_COLORS.length]! });
      x += w + 3;
      i++;
    }
    return out;
  }, []);
  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x, b.h / 2, rz + 13]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.85} />
          </mesh>
          {Array.from({ length: Math.floor(b.h / 3) }).map((_, f) => (
            <mesh key={f} position={[b.x, 2 + f * 3, rz + 7.98]}>
              <planeGeometry args={[b.w * 0.8, 1.1]} />
              <meshStandardMaterial color="#5d7a94" roughness={0.1} metalness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {[-40, -30, -20, 30, 45, 60, 75].map((x) => (
        <Tree key={x} x={x} z={rz + 5.5} s={0.9} />
      ))}
      {[-35, -22, 50, 65, 80].map((x, i) => (
        <Tree key={`b${x}`} x={x} z={backZ - 6 - (i % 2) * 4} s={1.2} />
      ))}
    </group>
  );
}

/** Ambient traffic on the far lane. */
export function Traffic() {
  const shopLevel = useGame((s) => s.game?.shopLevel ?? 1);
  const rz = roadZ(shopLevel) + 1.7;
  const cars = useRef<(THREE.Group | null)[]>([]);
  const offsets = [0, 55, 105];
  const models = ["sedan", "taxi", "suv"];
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cars.current.forEach((g, i) => {
      if (!g) return;
      const span = 170;
      const x = 95 - (((t * (9 + i * 2) + offsets[i]!) % span) + span) % span;
      g.position.set(x, 0, rz);
    });
  });
  return (
    <group>
      {models.map((m, i) => (
        <group key={m} ref={(el) => { cars.current[i] = el; }} rotation-y={-Math.PI / 2}>
          <StaticModel name={m} size={4.4} />
        </group>
      ))}
    </group>
  );
}
