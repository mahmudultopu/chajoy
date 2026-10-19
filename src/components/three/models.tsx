"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { ProductVisual } from "@/lib/db/schema";
import { citrusTexture, condensationMaps, cupPrintTexture, gradientTexture, seedBumpTexture, tigerStripeTexture, waffleTextures } from "./textures";

export type Quality = "high" | "medium" | "low";
type GroupProps = ThreeElements["group"];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ cup

/** Tapered plastic cup. `height` scales with cup size (S/M/L). */
export function cupProfile(height: number, bottomR = 0.6, topR = 0.82) {
  const lip = 0.025;
  const wall = 0.022;
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(0, 0.012));
  pts.push(new THREE.Vector2(bottomR - 0.04, 0));
  pts.push(new THREE.Vector2(bottomR, 0.035));
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(bottomR + (topR - bottomR) * t, 0.035 + (height - 0.035) * t));
  }
  pts.push(new THREE.Vector2(topR + lip, height + 0.012));
  pts.push(new THREE.Vector2(topR + lip * 0.4, height + lip * 1.4));
  pts.push(new THREE.Vector2(topR - wall, height));
  for (let i = 12; i >= 1; i--) {
    const t = i / 12;
    pts.push(new THREE.Vector2(bottomR - wall + (topR - bottomR) * t, 0.06 + (height - 0.06) * t));
  }
  pts.push(new THREE.Vector2(0, 0.06));
  return pts;
}

export function radiusAt(y: number, height: number, bottomR = 0.6, topR = 0.82) {
  return bottomR + (topR - bottomR) * Math.min(1, Math.max(0, y / height));
}

function CupShell({ height, quality, cold = true }: { height: number; quality: Quality; cold?: boolean }) {
  const geom = useMemo(() => new THREE.LatheGeometry(cupProfile(height), quality === "low" ? 40 : 72), [height, quality]);
  const maps = useMemo(() => (cold && quality !== "low" ? condensationMaps() : null), [cold, quality]);
  if (quality === "low") {
    return (
      <mesh geometry={geom}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.22} roughness={0.15} metalness={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    );
  }
  return (
    <mesh geometry={geom}>
      <meshPhysicalMaterial
        color="#ffffff"
        transmission={1}
        thickness={0.12}
        ior={1.46}
        roughness={0.05}
        roughnessMap={maps?.roughness ?? null}
        normalMap={maps?.normal ?? null}
        normalScale={new THREE.Vector2(0.45, 0.45)}
        clearcoat={1}
        clearcoatRoughness={0.06}
        specularIntensity={1}
        envMapIntensity={1.15}
        transparent={false}
      />
    </mesh>
  );
}

/** White CHAJOY print on the cup front (illustrative). */
function CupPrint({ height }: { height: number }) {
  const geom = useMemo(() => {
    const y0 = height * 0.42;
    const y1 = height * 0.78;
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const y = y0 + ((y1 - y0) * i) / 8;
      pts.push(new THREE.Vector2(radiusAt(y, height) + 0.006, y));
    }
    // a slice of the lathe centred on +Z (towards the camera)
    return new THREE.LatheGeometry(pts, 24, -0.55, 1.1);
  }, [height]);
  const tex = useMemo(() => cupPrintTexture(), []);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.5} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

function Liquid({ height, fill, visual, from = 0.07 }: { height: number; fill: number; visual: ProductVisual; from?: number }) {
  const top = height * fill;
  const geom = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, from)];
    for (let i = 0; i <= 10; i++) {
      const y = from + ((top - from) * i) / 10;
      pts.push(new THREE.Vector2(radiusAt(y, height) - 0.03, y));
    }
    pts.push(new THREE.Vector2(0, top));
    return new THREE.LatheGeometry(pts, 64);
  }, [height, top, from]);
  const map = useMemo(() => {
    if (visual.stripes) return tigerStripeTexture(visual.liquid ?? "#cfa77c", visual.stripes);
    if (visual.liquid2) return gradientTexture(visual.liquid ?? "#ffffff", visual.liquid2, 0.45);
    if (visual.clear) {
      const c = new THREE.Color(visual.liquid ?? "#e9a43c");
      const light = "#" + c.clone().lerp(new THREE.Color("#fff6d8"), 0.35).getHexString();
      return gradientTexture(light, visual.liquid ?? "#e9a43c", 0.4);
    }
    return null;
  }, [visual]);
  return (
    <mesh geometry={geom}>
      <meshPhysicalMaterial
        color={map ? "#ffffff" : (visual.liquid ?? "#e6d2bf")}
        map={map}
        roughness={visual.clear ? 0.12 : 0.38}
        clearcoat={visual.clear ? 1 : 0.4}
        clearcoatRoughness={0.2}
        sheen={visual.clear ? 0 : 0.25}
        sheenColor="#f3dcc0"
        emissive={visual.clear ? (visual.liquid ?? "#000") : "#000000"}
        emissiveIntensity={visual.clear ? 0.12 : 0}
      />
    </mesh>
  );
}

export function PearlMaterial() {
  return <meshPhysicalMaterial color="#26140a" roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} sheen={0.4} sheenColor="#6b3a1a" />;
}

/** Boba pearls packed at the bottom, visible through the cup wall. */
function Pearls({ height, count = 46, color, seed = 1 }: { height: number; count?: number; color?: string; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rand = seeded(seed);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(i / 16);
      const y = 0.13 + layer * 0.13 + rand() * 0.03;
      const R = radiusAt(y, height) - 0.11 - rand() * 0.18;
      const a = rand() * Math.PI * 2;
      d.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
      d.scale.setScalar(0.88 + rand() * 0.24);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, height, seed]);
  return (
    <group>
      {/* dark syrup core so gaps between pearls read as brown sugar, not empty */}
      <mesh position-y={0.28}>
        <cylinderGeometry args={[radiusAt(0.3, height) - 0.2, 0.42, 0.42, 32]} />
        <meshStandardMaterial color={color ? "#2a1b20" : "#3a200f"} roughness={0.4} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.078, 18, 14]} />
        {color ? <meshPhysicalMaterial color={color} roughness={0.2} clearcoat={1} /> : <PearlMaterial />}
      </instancedMesh>
    </group>
  );
}

function JellyCubes({ height, count = 24 }: { height: number; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const rand = seeded(11);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const y = 0.12 + rand() * 0.45;
      const R = radiusAt(y, height) - 0.1 - rand() * 0.25;
      const a = rand() * Math.PI * 2;
      d.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
      d.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, height]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.11, 0.11, 0.11]} />
      <meshPhysicalMaterial color="#fbf8ef" roughness={0.1} transmission={0.4} thickness={0.2} />
    </instancedMesh>
  );
}

export function IceCube({ size = 0.32, quality = "high" as Quality, ...props }: { size?: number; quality?: Quality } & GroupProps) {
  return (
    <group {...props}>
      <RoundedBox args={[size, size * 0.92, size]} radius={size * 0.16} smoothness={3}>
        {quality === "low" ? (
          <meshStandardMaterial color="#eef6ff" transparent opacity={0.55} roughness={0.1} />
        ) : (
          <meshPhysicalMaterial color="#f4fbff" transmission={1} thickness={size} roughness={0.12} ior={1.31} clearcoat={1} attenuationColor="#dff2ff" attenuationDistance={1.5} />
        )}
      </RoundedBox>
    </group>
  );
}

function IceTop({ height, fill, quality }: { height: number; fill: number; quality: Quality }) {
  const top = height * fill;
  const r = radiusAt(top, height) - 0.2;
  const cubes = useMemo(() => {
    const rand = seeded(5);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rand();
      const rr = i === 0 ? 0 : r * (0.45 + rand() * 0.5);
      return { p: [Math.cos(a) * rr, top + 0.02 + rand() * 0.12, Math.sin(a) * rr] as [number, number, number], rot: [rand() * 0.9, rand() * 3, rand() * 0.9] as [number, number, number], s: 0.24 + rand() * 0.08 };
    });
  }, [r, top]);
  return (
    <group>
      {cubes.map((c, i) => (
        <IceCube key={i} position={c.p} rotation={c.rot} size={c.s} quality={quality} />
      ))}
    </group>
  );
}

function Straw({ height }: { height: number }) {
  return (
    <mesh position={[0.18, height * 0.62, -0.05]} rotation={[0.1, 0, -0.16]}>
      <cylinderGeometry args={[0.07, 0.07, height * 1.15, 24, 1, true]} />
      <meshPhysicalMaterial color="#d4e6a3" roughness={0.3} transmission={0.5} thickness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

export const CUP_HEIGHT: Record<string, number> = { S: 2.0, M: 2.45, L: 2.9, ONE: 2.2 };

/** A CHAJOY drink, built from a product's visual preset. */
export function Drink({
  visual,
  size = "M",
  temperature = "cold",
  quality = "high",
  straw = false,
  print = true,
}: {
  visual: ProductVisual;
  size?: string;
  temperature?: "cold" | "hot";
  quality?: Quality;
  straw?: boolean;
  print?: boolean;
}) {
  const height = CUP_HEIGHT[size] ?? 2.45;
  const fill = visual.topping ? 0.9 : 0.86;
  const pearlsFrom = visual.pearls ? 0.5 : 0.07;
  return (
    <group position-y={-height / 2}>
      {visual.pearls && <Pearls height={height} color={visual.stripes ? undefined : "#5b2b3a"} />}
      {visual.jelly && <JellyCubes height={height} />}
      <Liquid height={height} fill={fill} visual={visual} from={pearlsFrom} />
      {visual.ice && temperature === "cold" && !visual.topping && <IceTop height={height} fill={fill} quality={quality} />}
      {visual.topping && <Topping height={height} fill={fill} visual={visual} quality={quality} />}
      {visual.fruit && (visual.fruit === "lemon" || visual.fruit === "lime") && <FloatingSlices height={height} kind={visual.fruit} />}
      {straw && <Straw height={height} />}
      <CupShell height={height} quality={quality} cold={temperature === "cold"} />
      {print && <CupPrint height={height} />}
    </group>
  );
}

function FloatingSlices({ height, kind }: { height: number; kind: "lemon" | "lime" }) {
  // slices pressed against the inside wall, like the menu photos
  return (
    <group>
      {[0.35, 0.58].map((t, i) => {
        const y = height * t;
        const r = radiusAt(y, height) - 0.06;
        const a = Math.PI / 2 + (i ? 0.7 : -0.5);
        return <CitrusSlice key={i} kind={kind} radius={0.3} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[0, -a + Math.PI / 2, 0]} />;
      })}
    </group>
  );
}

function Topping({ height, fill, visual, quality }: { height: number; fill: number; visual: ProductVisual; quality: Quality }) {
  const top = height * fill;
  const r = radiusAt(top, height);
  return (
    <group position-y={top}>
      {/* whipped dome */}
      <mesh scale={[r - 0.04, 0.32, r - 0.04]}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={visual.liquid2 ?? "#fbf6ee"} roughness={0.65} sheen={1} sheenColor="#ffffff" />
      </mesh>
      {visual.fruit === "strawberry" && (
        <>
          <Strawberry scale={0.42} position={[0.12, 0.3, 0.1]} rotation={[0.3, 0, 0.4]} />
          <Strawberry scale={0.34} position={[-0.25, 0.22, -0.05]} rotation={[-0.2, 1, -0.5]} />
        </>
      )}
      {visual.fruit === "blueberry" && <BerryPile color="#2f2a5a" />}
      {(visual.fruit === "peach" || visual.fruit === "guava") && <ChunkPile color={visual.fruit === "peach" ? "#f6a37f" : "#ef6e62"} />}
      {visual.topping === "crumbs" && <ChunkPile color="#1d1412" small />}
      {quality !== "low" && visual.fruit === "oreo" && <Oreo position={[0.3, 0.28, 0.1]} rotation={[1.1, 0.3, 0.2]} scale={0.7} />}
    </group>
  );
}

function BerryPile({ color }: { color: string }) {
  const items = useMemo(() => {
    const rand = seeded(21);
    return Array.from({ length: 9 }, () => [(rand() - 0.5) * 0.7, 0.18 + rand() * 0.14, (rand() - 0.5) * 0.7] as [number, number, number]);
  }, []);
  return (
    <group>
      {items.map((p, i) => (
        <Blueberry key={i} position={p} color={color} />
      ))}
    </group>
  );
}

function ChunkPile({ color, small }: { color: string; small?: boolean }) {
  const items = useMemo(() => {
    const rand = seeded(color.length * 7);
    return Array.from({ length: small ? 18 : 8 }, () => ({
      p: [(rand() - 0.5) * 0.8, 0.2 + rand() * 0.14, (rand() - 0.5) * 0.8] as [number, number, number],
      r: [rand() * 3, rand() * 3, rand() * 3] as [number, number, number],
      s: small ? 0.05 + rand() * 0.04 : 0.11 + rand() * 0.06,
    }));
  }, [color, small]);
  return (
    <group>
      {items.map((c, i) => (
        <RoundedBox key={i} args={[c.s, c.s * 0.8, c.s]} radius={c.s * 0.25} smoothness={2} position={c.p} rotation={c.r}>
          <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={small ? 0 : 0.6} />
        </RoundedBox>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ soft serve & cone

const VANILLA = new THREE.Color("#fbf3df");
const MATCHA = new THREE.Color("#a9c96a");

/**
 * Soft serve as a swirl surface: a tapering cone whose radius bulges along a
 * helix, so the coils read as one piped rope. "twist" colours alternate along
 * the rope like CHAJOY's original/matcha twist.
 */
export function softServeGeometry({ turns = 3.3, height = 1.3, base = 0.56, serve = "twist" as "original" | "matcha" | "twist", rows = 140, cols = 72 }) {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    const env = base * Math.pow(1 - v, 0.72) * (1 - 0.18 * Math.pow(v, 6));
    for (let j = 0; j <= cols; j++) {
      const u = (j / cols) * Math.PI * 2;
      const phase = turns * v * Math.PI * 2 - u;
      const coil = 0.5 + 0.5 * Math.cos(phase); // 1 on a coil, 0 in the groove
      const r = env * (0.78 + 0.26 * Math.pow(coil, 0.55));
      // curl the tip slightly to one side
      const curl = Math.pow(v, 4) * 0.12;
      const y = v * height + coil * 0.02 * (1 - v);
      pos.push(Math.sin(u) * r + curl, y, Math.cos(u) * r);
      let c = VANILLA;
      if (serve === "matcha") c = MATCHA;
      else if (serve === "twist") {
        // two ropes piped together: half the helix vanilla, half matcha
        const k = 0.5 + 0.5 * Math.sin(phase * 0.5 + u * 0.5 + Math.PI / 4);
        c = VANILLA.clone().lerp(MATCHA, THREE.MathUtils.smoothstep(k, 0.4, 0.6));
      }
      const shade = 0.88 + 0.12 * coil; // a touch darker in the grooves
      col.push(c.r * shade, c.g * shade, c.b * shade);
    }
  }
  const row = cols + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function SoftServe({ serve = "twist", scale = 1 }: { serve?: "original" | "matcha" | "twist"; scale?: number }) {
  const geom = useMemo(() => softServeGeometry({ serve }), [serve]);
  return (
    <mesh geometry={geom} scale={scale}>
      <meshPhysicalMaterial vertexColors roughness={0.55} sheen={1} sheenRoughness={0.6} sheenColor="#ffffff" clearcoat={0.15} />
    </mesh>
  );
}

export function Cone({ serve = "twist" as "original" | "matcha" | "twist", ...props }: { serve?: "original" | "matcha" | "twist" } & GroupProps) {
  const { map, bump } = useMemo(() => waffleTextures(), []);
  return (
    <group {...props}>
      <mesh position-y={-0.85} rotation-x={Math.PI}>
        <coneGeometry args={[0.56, 1.7, 48, 1, true]} />
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.6} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.0} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.55, 0.055, 12, 48]} />
        <meshStandardMaterial map={map} roughness={0.8} />
      </mesh>
      <group position-y={0.05}>
        <SoftServe serve={serve} />
      </group>
    </group>
  );
}

/** Sundae: short cup filled with soft serve, sauce, toppings. */
export function Sundae({ visual, flavour = "original", quality = "high" }: { visual: ProductVisual; flavour?: "original" | "matcha"; quality?: Quality }) {
  const height = 1.75;
  const fillColor = flavour === "matcha" ? "#9fc25c" : "#f8f1e2";
  const sauce = visual.sauce ?? "#c8304b";
  return (
    <group position-y={-0.9}>
      <Liquid height={height} fill={0.97} visual={{ vessel: "cup", liquid: fillColor, stripes: sauce }} />
      <group position-y={height * 0.97}>
        <SoftServe serve={flavour === "matcha" ? "matcha" : "original"} scale={1.2} />
        {visual.pearls && <BerryPile color="#26140a" />}
        {visual.fruit === "strawberry" && <Strawberry scale={0.38} position={[0.32, 0.25, 0.25]} rotation={[0.2, 0.4, 0.5]} />}
        {visual.fruit === "blueberry" && <BerryPile color="#2f2a5a" />}
        {(visual.fruit === "peach" || visual.fruit === "guava") && <ChunkPile color={visual.fruit === "peach" ? "#f6a37f" : "#ef6e62"} />}
        {visual.fruit === "oreo" && <ChunkPile color="#1d1412" small />}
        <SauceDrizzle color={sauce} />
      </group>
      <CupShell height={height} quality={quality} cold />
      <CupPrint height={height} />
    </group>
  );
}

function SauceDrizzle({ color }: { color: string }) {
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const th = t * Math.PI * 5;
      const R = 0.55 * (1 - t * 0.8);
      pts.push(new THREE.Vector3(Math.cos(th) * R, 0.12 + t * 0.9 + Math.sin(t * 40) * 0.02, Math.sin(th) * R));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.035, 8, false);
  }, []);
  return (
    <mesh geometry={geom} scale={1.2}>
      <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={1} />
    </mesh>
  );
}

// ------------------------------------------------------------------ garnish

export function CitrusSlice({ kind = "lemon", radius = 0.42, ...props }: { kind?: "lemon" | "lime"; radius?: number } & GroupProps) {
  const tex = useMemo(() => citrusTexture(kind), [kind]);
  const rind = kind === "lemon" ? "#efc72c" : "#5f9a22";
  return (
    <group {...props}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[radius, radius, 0.07, 48]} />
        <meshPhysicalMaterial attach="material-0" color={rind} roughness={0.45} clearcoat={0.4} />
        <meshPhysicalMaterial attach="material-1" map={tex} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} transmission={0.15} thickness={0.1} />
        <meshPhysicalMaterial attach="material-2" map={tex} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} transmission={0.15} thickness={0.1} />
      </mesh>
    </group>
  );
}

const strawberryProfile = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    // heart-ish: pointed bottom, broad shoulders, flat-ish top
    const y = t * 1.1;
    const r = Math.sin(Math.pow(t, 0.75) * Math.PI) * (0.38 + 0.18 * t) * (t > 0.9 ? 1 - (t - 0.9) * 4 : 1);
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  return pts;
})();

export function Strawberry(props: GroupProps) {
  const bump = useMemo(() => seedBumpTexture(), []);
  const geom = useMemo(() => new THREE.LatheGeometry(strawberryProfile, 40), []);
  const leaves = useMemo(() => {
    const s = new THREE.Shape();
    const n = 7;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.32 : 0.1;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geom} rotation-x={Math.PI} position-y={1.1}>
        <meshPhysicalMaterial color="#d81f35" roughness={0.32} clearcoat={0.9} clearcoatRoughness={0.25} bumpMap={bump} bumpScale={2.4} sheen={0.3} sheenColor="#ff8a8a" />
      </mesh>
      <mesh geometry={leaves} rotation-x={-Math.PI / 2} position-y={1.12}>
        <meshStandardMaterial color="#3f8a2a" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Blueberry({ color = "#2f2a5a", ...props }: { color?: string } & GroupProps) {
  return (
    <group {...props}>
      <mesh scale={[1, 0.88, 1]}>
        <sphereGeometry args={[0.1, 20, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.55} sheen={1} sheenColor="#8a8fc4" sheenRoughness={0.4} />
      </mesh>
    </group>
  );
}

export function Pearl(props: GroupProps) {
  return (
    <group {...props}>
      <mesh>
        <sphereGeometry args={[0.1, 24, 18]} />
        <PearlMaterial />
      </mesh>
    </group>
  );
}

export function Oreo(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position-y={0.035}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#1a1210" roughness={0.7} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 32]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.6} />
      </mesh>
      <mesh position-y={-0.035}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#1a1210" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function TeaLeaf({ color = "#5f9a22", ...props }: { color?: string } & GroupProps) {
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.4);
    s.bezierCurveTo(0.24, -0.2, 0.22, 0.2, 0, 0.42);
    s.bezierCurveTo(-0.22, 0.2, -0.24, -0.2, 0, -0.4);
    const g = new THREE.ShapeGeometry(s, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getX(i), 2) * 1.6 + Math.pow(p.getY(i), 2) * 0.2);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geom}>
        <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.5} side={THREE.DoubleSide} sheen={0.4} sheenColor="#d4e6a3" />
      </mesh>
    </group>
  );
}

export function Droplet(props: GroupProps) {
  return (
    <group {...props}>
      <mesh scale={[1, 1.25, 1]}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.1} roughness={0.02} ior={1.33} />
      </mesh>
    </group>
  );
}
