import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Product, Shape } from "../sim/products";
import { grille, phoneScreen, screenTex } from "./textures";

export const M = (name: string) => `/models/${name}.glb`;

const GLB_FOR_SHAPE: Partial<Record<Shape, string>> = {
  fridge: "kitchenFridge",
  fridgeLarge: "kitchenFridgeLarge",
  fridgeSmall: "kitchenFridgeSmall",
  washer: "washer",
  dryer: "dryer",
  washerDryer: "washerDryerStacked",
  tvVintage: "televisionVintage",
  monitor: "computerScreen",
  speaker: "speaker",
  speakerSmall: "speakerSmall",
  radio: "radio",
  laptop: "laptop",
  keyboard: "computerKeyboard",
  mouse: "computerMouse",
  blender: "kitchenBlender",
  toaster: "toaster",
  coffee: "kitchenCoffeeMachine",
  microwave: "kitchenMicrowave",
  hood: "hoodModern",
  lamp: "lampRoundFloor",
  fanCeiling: "ceilingFan",
};

/** Largest-dimension targets where height alone is misleading. */
const SIZE_OVERRIDE: Partial<Record<Shape, number>> = { keyboard: 0.45, mouse: 0.12, laptop: 0.36, fanCeiling: 1.2 };

export const PRELOAD = [
  ...new Set(Object.values(GLB_FOR_SHAPE)),
  "bookcaseOpen", "pottedPlant", "plantSmall1", "computerScreen", "cardboardBoxClosed", "delivery", "sedan", "taxi", "suv",
  "character-male-a", "character-male-b", "character-male-c", "character-male-d", "character-male-e",
  "character-female-a", "character-female-b", "character-female-c", "character-female-d", "character-female-e", "character-worker",
];

const matCache = new Map<string, THREE.Material>();
/** Kenney furniture uses unlit materials; convert to PBR so it takes scene lighting. */
function litMaterial(m: THREE.Material): THREE.Material {
  const hit = matCache.get(m.uuid);
  if (hit) return hit;
  let out: THREE.Material = m;
  if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
    const b = m as THREE.MeshBasicMaterial;
    out = new THREE.MeshStandardMaterial({ color: b.color, map: b.map, roughness: 0.45, metalness: 0.15, transparent: b.transparent, opacity: b.opacity });
  } else if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    const s = (m as THREE.MeshStandardMaterial).clone();
    s.roughness = Math.min(s.roughness, 0.6);
    out = s;
  }
  matCache.set(m.uuid, out);
  return out;
}

const boxTmp = new THREE.Box3();
const sizeTmp = new THREE.Vector3();
const centerTmp = new THREE.Vector3();

/** Clone a static GLB, convert materials, normalise: largest dimension = size, centred on XZ, feet at y=0. */
export function useStaticModel(name: string, size: number, by: "max" | "height" = "max") {
  const { scene } = useGLTF(M(name));
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(litMaterial) : litMaterial(mesh.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    boxTmp.setFromObject(clone);
    boxTmp.getSize(sizeTmp);
    boxTmp.getCenter(centerTmp);
    const dim = by === "height" ? sizeTmp.y : Math.max(sizeTmp.x, sizeTmp.y, sizeTmp.z);
    const s = size / (dim || 1);
    const wrap = new THREE.Group();
    clone.position.set(-centerTmp.x * s, -boxTmp.min.y * s, -centerTmp.z * s);
    clone.scale.setScalar(s);
    wrap.add(clone);
    return wrap;
  }, [scene, size, by]);
}

export function StaticModel({ name, size, by = "max" }: { name: string; size: number; by?: "max" | "height" }) {
  const obj = useStaticModel(name, size, by);
  return <primitive object={obj} />;
}

function Std({ color, rough = 0.45, metal = 0.1, ...rest }: { color: string; rough?: number; metal?: number } & Partial<THREE.MeshStandardMaterialParameters>) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} {...rest} />;
}

function Fan({ h, color, pole }: { h: number; color: string; pole: number }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (blades.current) blades.current.rotation.z += Math.min(d, 0.05) * 14;
  });
  const r = Math.max(0.18, h * 0.32);
  const cy = pole > 0 ? pole : h * 0.6;
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[r * 0.8, r * 0.9, 0.06, 24]} />
        <Std color="#3b4048" />
      </mesh>
      <mesh position={[0, cy / 2, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, cy, 10]} />
        <Std color="#c9ced4" metal={0.6} rough={0.3} />
      </mesh>
      <group position={[0, cy, 0.05]}>
        <mesh>
          <torusGeometry args={[r, 0.012, 8, 40]} />
          <Std color={color} metal={0.5} rough={0.35} />
        </mesh>
        <mesh position={[0, 0, -0.1]} castShadow>
          <sphereGeometry args={[0.08, 16, 12]} />
          <Std color={color} />
        </mesh>
        <group ref={blades}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0.3, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
              <boxGeometry args={[r * 0.35, r * 1.7, 0.01]} />
              <meshStandardMaterial color="#7fb2e5" transparent opacity={0.85} roughness={0.2} />
            </mesh>
          ))}
        </group>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
            <boxGeometry args={[r * 2, 0.006, 0.006]} />
            <Std color="#9aa3ad" metal={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function TV({ h }: { h: number }) {
  const w = h * 1.78;
  const tex = useMemo(() => screenTex(), []);
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(1, w * 1.05), 0.5, 0.5]} />
        <Std color="#2d2620" rough={0.6} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[w * 0.3, 0.04, 0.2]} />
        <Std color="#222" metal={0.7} rough={0.3} />
      </mesh>
      <group position={[0, 0.56 + h / 2 + 0.04, 0]}>
        <mesh castShadow>
          <boxGeometry args={[w + 0.03, h + 0.03, 0.04]} />
          <Std color="#0c0c0c" rough={0.25} metal={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

function BoxProduct({ w, h, d, color, front, frontColor }: { w: number; h: number; d: number; color: string; front?: THREE.Texture; frontColor?: string }) {
  return (
    <group position={[0, h / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Std color={color} />
      </mesh>
      {front || frontColor ? (
        <mesh position={[0, 0, d / 2 + 0.002]}>
          <planeGeometry args={[w * 0.86, h * 0.8]} />
          <meshStandardMaterial map={front ?? null} color={frontColor ?? "#ffffff"} roughness={0.5} />
        </mesh>
      ) : null}
    </group>
  );
}

function WallBoard({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <group>
      <mesh position={[0, height / 2, -0.32]} castShadow receiveShadow>
        <boxGeometry args={[1.1, height, 0.06]} />
        <Std color="#e8e2d8" rough={0.7} />
      </mesh>
      <mesh position={[0, 0.04, -0.2]} receiveShadow>
        <boxGeometry args={[1.1, 0.08, 0.3]} />
        <Std color="#3a3f46" />
      </mesh>
      {children}
    </group>
  );
}

/** Draws any catalogue product with feet at y=0, facing +z. */
export function ProductModel({ product }: { product: Product }) {
  const glb = GLB_FOR_SHAPE[product.shape];
  const h = product.height * (product.small ? 1.6 : 1);
  const c = product.color;
  if (glb && product.shape !== "fanCeiling") {
    const size = (SIZE_OVERRIDE[product.shape] ?? product.height) * (product.small ? 1.6 : 1);
    return <StaticModel name={glb} size={size} />;
  }
  switch (product.shape) {
    case "fanCeiling":
      return (
        <group>
          <mesh position={[0, 1.6, -0.1]}>
            <cylinderGeometry args={[0.015, 0.015, 3.2, 8]} />
            <Std color="#8a8f96" metal={0.7} />
          </mesh>
          <SpinGroup y={3.0} speed={2}>
            <StaticModel name="ceilingFan" size={1.2} />
          </SpinGroup>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.4, 0.45, 0.1, 24]} />
            <Std color="#3b4048" />
          </mesh>
        </group>
      );
    case "fanTable":
      return <Fan h={h} color={c} pole={0} />;
    case "fanPedestal":
      return <Fan h={0.55} color={c} pole={h} />;
    case "fanWall":
      return (
        <WallBoard height={1.8}>
          <group position={[0, 1.2, -0.25]}>
            <Fan h={0.55} color={c} pole={0.01} />
          </group>
        </WallBoard>
      );
    case "cooler":
    case "coolerTower": {
      const tower = product.shape === "coolerTower";
      const w = tower ? 0.38 : h * 0.55;
      const d = tower ? 0.36 : h * 0.45;
      return (
        <group>
          <BoxProduct w={w} h={h} d={d} color={c} front={grille()} />
          <mesh position={[0, h + 0.02, 0]}>
            <boxGeometry args={[w * 1.02, 0.04, d * 1.02]} />
            <Std color="#4aa3d8" />
          </mesh>
        </group>
      );
    }
    case "acSplit":
      return (
        <WallBoard height={2.2}>
          <group position={[0, 1.75, -0.18]}>
            <mesh castShadow>
              <boxGeometry args={[0.95, h, 0.22]} />
              <Std color={c} rough={0.3} />
            </mesh>
            <mesh position={[0, -h / 2 + 0.05, 0.112]}>
              <boxGeometry args={[0.85, 0.04, 0.01]} />
              <Std color="#9aa5b1" />
            </mesh>
            <mesh position={[0.36, 0.05, 0.112]}>
              <planeGeometry args={[0.08, 0.03]} />
              <meshStandardMaterial color="#38e07b" emissive="#38e07b" emissiveIntensity={1.2} />
            </mesh>
          </group>
          <group position={[0, 0, 0.05]}>
            <BoxProduct w={0.8} h={0.55} d={0.3} color="#e6e8ea" front={grille()} />
          </group>
        </WallBoard>
      );
    case "acWindow":
      return (
        <group>
          <BoxProduct w={0.7} h={0.5} d={0.6} color="#2f3640" />
          <group position={[0, 0.5, 0]}>
            <BoxProduct w={0.66} h={h} d={0.62} color={c} front={grille()} />
          </group>
        </group>
      );
    case "tv":
      return <TV h={h} />;
    case "phone":
    case "tablet": {
      const tab = product.shape === "tablet";
      const pw = tab ? 0.25 : 0.08 * 1.6;
      const ph = tab ? 0.34 : 0.16 * 1.6;
      return (
        <group position={[0, 0.02, 0]}>
          <mesh position={[0, 0.01, 0]} castShadow>
            <boxGeometry args={[pw * 1.4, 0.02, 0.14]} />
            <Std color="#d9dde2" metal={0.5} rough={0.25} />
          </mesh>
          <group position={[0, ph / 2 + 0.02, 0]} rotation={[-0.25, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[pw, ph, 0.012]} />
              <Std color={c} metal={0.6} rough={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.007]}>
              <planeGeometry args={[pw * 0.92, ph * 0.94]} />
              <meshStandardMaterial map={phoneScreen()} emissive="#ffffff" emissiveMap={phoneScreen()} emissiveIntensity={0.7} />
            </mesh>
          </group>
        </group>
      );
    }
    case "watch":
      return (
        <group position={[0, 0.06, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.012, 8, 24]} />
            <Std color="#333" />
          </mesh>
          <mesh position={[0, 0.06, 0.01]}>
            <boxGeometry args={[0.06, 0.07, 0.02]} />
            <Std color={c} metal={0.7} rough={0.2} />
          </mesh>
          <mesh position={[0, 0.06, 0.021]}>
            <planeGeometry args={[0.05, 0.06]} />
            <meshStandardMaterial map={phoneScreen()} emissive="#fff" emissiveMap={phoneScreen()} emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case "headphones":
      return (
        <group position={[0, 0.04, 0]}>
          <mesh position={[0, 0.16, 0]}>
            <torusGeometry args={[0.13, 0.015, 8, 24, Math.PI]} />
            <Std color={c} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.13, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.05, 20]} />
              <Std color={c} rough={0.6} />
            </mesh>
          ))}
        </group>
      );
    case "earphones":
      return (
        <group>
          <BoxProduct w={0.14} h={0.2} d={0.03} color="#f7f7f7" frontColor="#1d2c3d" />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.03, 0.12, 0.03]}>
              <sphereGeometry args={[0.014, 12, 10]} />
              <Std color={c} />
            </mesh>
          ))}
        </group>
      );
    case "charger":
    case "powerbank":
    case "router":
    case "extension":
    case "trimmer": {
      const dims: Record<string, [number, number, number]> = {
        charger: [0.07, 0.08, 0.05],
        powerbank: [0.11, 0.18, 0.025],
        router: [0.3, 0.06, 0.2],
        extension: [0.4, 0.06, 0.08],
        trimmer: [0.05, 0.22, 0.05],
      };
      const [w, hh, d] = dims[product.shape]!.map((v) => v * 1.4) as [number, number, number];
      return (
        <group>
          <BoxProduct w={w} h={hh} d={d} color={c} />
          {product.shape === "router"
            ? [-1, 1].map((s) => (
                <mesh key={s} position={[s * w * 0.4, hh + 0.12, -d / 2 + 0.02]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
                  <Std color="#111" />
                </mesh>
              ))
            : null}
          {product.shape === "powerbank" || product.shape === "router" ? (
            <mesh position={[0, hh * 0.8, d / 2 + 0.002]}>
              <planeGeometry args={[w * 0.3, 0.012]} />
              <meshStandardMaterial color="#3df58a" emissive="#3df58a" emissiveIntensity={1.5} />
            </mesh>
          ) : null}
        </group>
      );
    }
    case "bulb":
      return (
        <group>
          <BoxProduct w={0.32} h={0.1} d={0.12} color="#f4c542" />
          {[-0.11, -0.04, 0.04, 0.11].map((x) => (
            <mesh key={x} position={[x, 0.16, 0]}>
              <sphereGeometry args={[0.035, 14, 12]} />
              <meshStandardMaterial color="#fff8e1" emissive="#ffe8a8" emissiveIntensity={0.9} />
            </mesh>
          ))}
        </group>
      );
    case "kettle":
    case "riceCooker":
    case "juicer":
    case "hairdryer":
    case "geyserSmall":
    case "iron": {
      const r = product.shape === "riceCooker" ? 0.17 : product.shape === "juicer" ? 0.1 : 0.1;
      return (
        <group>
          <mesh position={[0, h * 0.4, 0]} castShadow>
            {product.shape === "geyserSmall" || product.shape === "iron" ? (
              <boxGeometry args={[product.shape === "iron" ? 0.16 : 0.3, h * 0.8, product.shape === "iron" ? 0.3 : 0.18]} />
            ) : (
              <cylinderGeometry args={[r, r * 1.1, h * 0.8, 24]} />
            )}
            <Std color={c} metal={0.3} rough={0.3} />
          </mesh>
          <mesh position={[0, h * 0.85, 0]} castShadow>
            <cylinderGeometry args={[r * 0.6, r * 0.9, h * 0.1, 20]} />
            <Std color="#2d3436" />
          </mesh>
          {product.shape === "juicer" ? (
            <mesh position={[0, h * 1.05, 0]}>
              <cylinderGeometry args={[0.09, 0.07, h * 0.4, 20]} />
              <meshStandardMaterial color="#d9f2ff" transparent opacity={0.45} roughness={0.05} />
            </mesh>
          ) : null}
        </group>
      );
    }
    case "geyser":
      return (
        <WallBoard height={2}>
          <group position={[0, 1.3, -0.05]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.24, h, 28]} />
              <Std color={c} rough={0.25} />
            </mesh>
            <mesh position={[0, -h * 0.25, 0.2]}>
              <boxGeometry args={[0.2, 0.08, 0.1]} />
              <Std color="#1e5fbf" />
            </mesh>
          </group>
        </WallBoard>
      );
    case "heater":
      return (
        <group>
          <BoxProduct w={0.38} h={h} d={0.22} color={c} />
          <mesh position={[0, h * 0.5, 0.112]}>
            <planeGeometry args={[0.28, h * 0.55]} />
            <meshStandardMaterial color="#ff7a2e" emissive="#ff5a1a" emissiveIntensity={1.4} />
          </mesh>
        </group>
      );
    case "oilHeater":
      return (
        <group>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[(i - 4) * 0.065, h / 2 + 0.06, 0]} castShadow>
              <boxGeometry args={[0.05, h, 0.2]} />
              <Std color={c} metal={0.4} rough={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.62, 0.04, 0.28]} />
            <Std color="#333" />
          </mesh>
        </group>
      );
    case "printer":
      return (
        <group>
          <BoxProduct w={0.45} h={h} d={0.36} color={c} />
          <mesh position={[0, h + 0.02, -0.1]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.36, 0.005, 0.2]} />
            <Std color="#ffffff" />
          </mesh>
        </group>
      );
    case "soundbar":
      return <BoxProduct w={0.9} h={0.1} d={0.1} color={c} front={grille()} />;
    case "console":
      return (
        <group>
          <BoxProduct w={0.35} h={0.1} d={0.28} color={c} />
          <mesh position={[0.25, 0.03, 0.15]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.09]} />
            <Std color="#222" />
          </mesh>
        </group>
      );
    case "camera":
      return (
        <group>
          <BoxProduct w={0.2} h={0.13} d={0.09} color={c} />
          <mesh position={[0.02, 0.065, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.05, 0.12, 20]} />
            <Std color="#1a1a1a" metal={0.5} rough={0.25} />
          </mesh>
        </group>
      );
    case "projector":
      return (
        <group>
          <BoxProduct w={0.32} h={0.12} d={0.26} color={c} />
          <mesh position={[0.08, 0.06, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 20]} />
            <meshStandardMaterial color="#9ad7ff" emissive="#9ad7ff" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case "purifier":
      return (
        <group>
          <BoxProduct w={0.3} h={h} d={0.25} color="#f5f7fa" />
          <mesh position={[0, h * 0.7, 0.126]}>
            <planeGeometry args={[0.22, 0.12]} />
            <Std color={c} />
          </mesh>
        </group>
      );
    case "vacuum":
      return (
        <group>
          <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.34, 20]} />
            <Std color={c} />
          </mesh>
          <mesh position={[0, 0.4, -0.1]} rotation={[0.4, 0, 0]}>
            <torusGeometry args={[0.18, 0.02, 8, 20, Math.PI]} />
            <Std color="#333" />
          </mesh>
        </group>
      );
    case "inverter":
      return (
        <group>
          <group position={[-0.22, 0, 0]}>
            <BoxProduct w={0.35} h={h * 0.8} d={0.25} color={c} frontColor="#1b2631" />
          </group>
          <group position={[0.22, 0, 0]}>
            <BoxProduct w={0.32} h={h} d={0.2} color="#d6dbdf" />
          </group>
        </group>
      );
    case "dishwasher":
      return (
        <group>
          <BoxProduct w={0.6} h={h} d={0.6} color={c} />
          <mesh position={[0, h - 0.06, 0.302]}>
            <planeGeometry args={[0.56, 0.08]} />
            <Std color="#2f3640" />
          </mesh>
        </group>
      );
    case "oven":
      return <BoxProduct w={0.5} h={h} d={0.38} color={c} frontColor="#111a22" />;
    case "stove":
      return (
        <group>
          <BoxProduct w={0.36} h={0.06} d={0.42} color={c} />
          <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.12, 32]} />
            <meshStandardMaterial color="#ff5a1a" emissive="#ff3a00" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    default:
      return <BoxProduct w={0.4} h={h} d={0.3} color={c} />;
  }
}

function SpinGroup({ y, speed, children }: { y: number; speed: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * speed;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      {children}
    </group>
  );
}

if (typeof window !== "undefined") for (const n of PRELOAD) useGLTF.preload(M(n));
