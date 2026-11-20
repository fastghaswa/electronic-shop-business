import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { runtime } from "../runtime";
import type { Display } from "../sim/types";
import { getProduct } from "../sim/products";
import { displayFootprint } from "../sim/layout";
import { formatMoney } from "../sim/economy";
import { ProductModel, StaticModel } from "./Models";
import { priceTag } from "./textures";

function Pedestal() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.84, 0.66]} />
        <meshStandardMaterial color="#f7f5f0" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.72, 0.03, 0.72]} />
        <meshStandardMaterial color="#20262e" roughness={0.12} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.68, 0.12, 0.68]} />
        <meshStandardMaterial color="#2b3440" roughness={0.4} />
      </mesh>
    </group>
  );
}

function DecorModel({ kind }: { kind: string }) {
  switch (kind) {
    case "shelf":
      return <StaticModel name="bookcaseOpen" size={1.9} />;
    case "plant":
      return <StaticModel name="pottedPlant" size={1.3} />;
    case "plantSmall":
    case "plant-small":
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.7, 20]} />
            <meshStandardMaterial color="#ede6da" roughness={0.4} />
          </mesh>
          <group position={[0, 0.7, 0]}>
            <StaticModel name="plantSmall1" size={0.5} />
          </group>
        </group>
      );
    case "lamp":
      return <StaticModel name="lampRoundFloor" size={1.7} />;
    case "table":
      return (
        <group>
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * 0.38, 0.4, sz * 0.38]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
                <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.25} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.9]} />
            <meshPhysicalMaterial color="#cfeaf5" transparent opacity={0.45} roughness={0.05} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function Tag({ name, price, stock, y, z }: { name: string; price: number; stock: number; y: number; z: number }) {
  const tex = useMemo(() => priceTag(name, formatMoney(price), `In stock: ${stock}`, stock <= 0), [name, price, stock]);
  return (
    <mesh position={[0, y, z]} rotation-x={-0.35}>
      <planeGeometry args={[0.42, 0.21]} />
      <meshStandardMaterial map={tex} roughness={0.6} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.15} />
    </mesh>
  );
}

function DisplayItem({ d, stock, carried }: { d: Display; stock: number; carried: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const product = d.kind === "product" ? getProduct(d.ref) : undefined;
  const fp = displayFootprint(d);
  const carryRot = useGame((s) => s.carryRot);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (carried) {
      g.position.set(runtime.carry.x, 0.15 + Math.sin(clock.getElapsedTime() * 4) * 0.03, runtime.carry.z);
    } else {
      g.position.set(d.x, 0, d.z);
    }
    if (ring.current) {
      const show = carried || runtime.highlightId === d.id;
      ring.current.visible = show;
      const m = ring.current.material as THREE.MeshStandardMaterial;
      const col = carried ? (runtime.carry.valid ? "#35d07f" : "#ff5a4f") : "#f6c453";
      m.color.set(col);
      m.emissive.set(col);
    }
  });
  const rot = (carried ? carryRot : d.rot) * (Math.PI / 2);
  const tagZ = fp / 2 + 0.02;
  return (
    <group ref={group} position={[d.x, 0, d.z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} visible={false}>
        <ringGeometry args={[fp * 0.62, fp * 0.72, 4, 1]} />
        <meshStandardMaterial color="#f6c453" emissive="#f6c453" emissiveIntensity={1.4} />
      </mesh>
      <group rotation-y={rot}>
        <Suspense fallback={null}>
          {product ? (
            product.small ? (
              <>
                <Pedestal />
                <group position={[0, 0.865, 0]}>
                  <ProductModel product={product} />
                </group>
                <Tag name={product.name} price={product.retail} stock={stock} y={0.62} z={0.335} />
              </>
            ) : (
              <>
                <mesh position={[0, 0.03, 0]} receiveShadow>
                  <boxGeometry args={[fp, 0.06, fp]} />
                  <meshStandardMaterial color="#2b3440" roughness={0.3} metalness={0.3} />
                </mesh>
                <group position={[0, 0.06, 0]}>
                  <ProductModel product={product} />
                </group>
                <Tag name={product.name} price={product.retail} stock={stock} y={0.25} z={tagZ + 0.05} />
              </>
            )
          ) : (
            <DecorModel kind={d.ref} />
          )}
        </Suspense>
      </group>
    </group>
  );
}

export function Displays() {
  const displays = useGame((s) => s.game?.displays ?? []);
  const stock = useGame((s) => s.game?.shopStock ?? {});
  const carriedId = useGame((s) => s.carriedId);
  return (
    <group>
      {displays.map((d) => (
        <DisplayItem key={d.id} d={d} stock={d.kind === "product" ? (stock[d.ref] ?? 0) : 0} carried={carriedId === d.id} />
      ))}
    </group>
  );
}
