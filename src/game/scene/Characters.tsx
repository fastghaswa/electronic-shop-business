import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { M } from "./Models";
import { boxTex } from "./textures";

export const CUSTOMER_MODELS = [
  "character-male-a", "character-female-a", "character-male-b", "character-female-b", "character-male-e",
  "character-female-c", "character-male-c", "character-female-d", "character-female-e",
];

export interface CharPose {
  x: number;
  z: number;
  yaw: number;
  walking: boolean;
  carrying?: boolean;
  visible?: boolean;
  mood?: "happy" | "sad" | null;
}

const HEIGHT = 1.7;

/** Animated character. `pose` is read every frame (no React re-render). */
export function Character({ model, pose, tint }: { model: string; pose: () => CharPose; tint?: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(M(model));
  const { clone, scale, offsetY } = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
        if (tint && m.material && !Array.isArray(m.material)) {
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.color = new THREE.Color(tint);
          m.material = mat;
        }
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    const h = box.max.y - box.min.y || 1;
    return { clone: c, scale: HEIGHT / h, offsetY: -box.min.y };
  }, [scene, tint]);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string>("");
  const carryRef = useRef<THREE.Mesh>(null);
  const moodRef = useRef<THREE.Mesh>(null);
  const boxMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boxTex(), roughness: 0.8 }), []);

  const play = (name: string) => {
    if (current.current === name) return;
    const next = actions[name];
    if (!next) return;
    const prev = actions[current.current];
    next.reset().fadeIn(0.2).play();
    prev?.fadeOut(0.2);
    current.current = name;
  };

  useEffect(() => {
    play("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = pose();
    g.visible = p.visible !== false;
    if (!g.visible) return;
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.yaw;
    play(p.walking ? (p.carrying ? "walk" : "walk") : p.carrying ? "holding-both" : "idle");
    if (carryRef.current) carryRef.current.visible = !!p.carrying;
    if (moodRef.current) {
      moodRef.current.visible = !!p.mood;
      const mat = moodRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(p.mood === "happy" ? "#35d07f" : "#ff5a4f");
      mat.emissive.set(p.mood === "happy" ? "#35d07f" : "#ff5a4f");
    }
  });

  return (
    <group ref={group}>
      <group scale={scale}>
        <primitive object={clone} position={[0, offsetY, 0]} />
      </group>
      <mesh ref={carryRef} position={[0, 0.95, 0.32]} material={boxMat} castShadow visible={false}>
        <boxGeometry args={[0.36, 0.3, 0.3]} />
      </mesh>
      <mesh ref={moodRef} position={[0, 2.05, 0]} visible={false}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial color="#35d07f" emissive="#35d07f" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}
