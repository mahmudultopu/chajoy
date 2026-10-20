"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { ProductVisual } from "@/lib/db/schema";
import { Blueberry, CitrusSlice, Cone, ConeStand, CUP_HEIGHT, Drink, IceCube, Oreo, Strawberry, Sundae, TeaLeaf } from "./models";
import { ChocolateChunks, CoconutHalf, GuavaHalf, JasmineFlower, MatchaPowder, Peach, PearlPile, SugarCubes } from "./props";
import type { CompositionItem, PropSpec } from "./render-presets";

// Floor height for every composition.
export const FLOOR = -1.3;

function Backdrop({ bg, horizontal = false }: { bg: [string, string] | null; horizontal?: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    if (!bg) {
      scene.background = null;
      return;
    }
    const c = document.createElement("canvas");
    c.width = horizontal ? 1024 : 4;
    c.height = horizontal ? 4 : 512;
    const x = c.getContext("2d")!;
    const g = horizontal ? x.createLinearGradient(0, 0, 1024, 0) : x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, bg[0]);
    if (horizontal) g.addColorStop(0.45, bg[0]);
    else g.addColorStop(0.34, bg[1]);
    g.addColorStop(1, bg[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    return () => t.dispose();
  }, [bg, scene, horizontal]);
  return null;
}

/** Seamless sweep: an unlit floor in the backdrop colour plus a shadow-catcher. */
function Floor({ color }: { color: string | null }) {
  return (
    <group position-y={FLOOR}>
      {color && (
        <mesh rotation-x={-Math.PI / 2} userData={{ noShadow: true }}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow userData={{ noShadow: true }}>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={color ? 0.26 : 0.22} color="#3a2412" />
      </mesh>
    </group>
  );
}

/** Every mesh in the composition casts a shadow onto the floor. */
function CastShadows() {
  const { scene } = useThree();
  useEffect(() => {
    const t = setTimeout(() => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !m.userData.noShadow) m.castShadow = true;
      });
    }, 50);
    return () => clearTimeout(t);
  }, [scene]);
  return null;
}

function Prop({ spec }: { spec: PropSpec }) {
  const s = spec.s ?? 1;
  const common = { position: spec.p, rotation: spec.r ?? [0, 0, 0], scale: s } as const;
  switch (spec.kind) {
    case "lemon":
    case "lime":
      return <CitrusSlice kind={spec.kind} radius={0.38} {...common} />;
    case "strawberry":
      return <Strawberry {...common} />;
    case "peach":
      return <Peach {...common} />;
    case "guava":
      return <GuavaHalf {...common} />;
    case "coconut":
      return <CoconutHalf {...common} />;
    case "blueberries":
      return (
        <group {...common}>
          {[[0, 0.1, 0], [0.19, 0.1, 0.05], [-0.18, 0.1, 0.08], [0.06, 0.1, 0.2], [-0.05, 0.27, 0.08], [0.12, 0.26, -0.1], [-0.2, 0.1, -0.15]].map((p, i) => (
            <Blueberry key={i} position={p as [number, number, number]} color="#2f2a5a" />
          ))}
        </group>
      );
    case "oreo":
      return <Oreo {...common} />;
    case "jasmine":
      return <JasmineFlower {...common} />;
    case "leaf":
      return <TeaLeaf {...common} />;
    case "matcha":
      return <MatchaPowder {...common} />;
    case "chocolate":
      return <ChocolateChunks {...common} />;
    case "sugar":
      return <SugarCubes {...common} />;
    case "pearls":
      return <PearlPile {...common} />;
    case "ice":
      return <IceCube size={0.3} quality="high" {...common} />;
    case "cone":
      return <Cone serve="twist" {...common} />;
  }
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[-3.5, 7, 5]}
        intensity={2.1}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={14}
        shadow-bias={-0.0004}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[4, 2, -3]} intensity={0.9} color="#ffffff" />
      <Environment resolution={512} frames={1}>
        <Lightformer form="rect" intensity={5} position={[0, 6, 3]} rotation-x={Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[-5, 1.5, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[5, 1.5, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 1, -6]} scale={[14, 7, 1]} color="#fff6e6" />
        <Lightformer form="ring" intensity={4} position={[2.5, 3, 6]} scale={1.4} />
      </Environment>
    </>
  );
}

function Ready() {
  // count real rendered frames so shadows, environment and transmission have settled
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 45) (window as unknown as { __renderReady: boolean }).__renderReady = true;
  });
  return null;
}

/** One product standing on the floor, for compositions. */
function Placed({ item, visual }: { item: CompositionItem; visual: ProductVisual }) {
  const s = item.scale ?? 1;
  if (visual.vessel === "cone") {
    return (
      <group position={[item.x, FLOOR, item.z ?? 0]} scale={s}>
        <ConeStand />
        <Cone serve={item.serve ?? "twist"} position-y={1.84} />
      </group>
    );
  }
  const h = visual.vessel === "cup" ? (CUP_HEIGHT[item.size ?? "M"] ?? 2.45) : 1.8;
  return (
    <group position={[item.x, FLOOR + (h / 2) * s, item.z ?? 0]} scale={s} rotation-y={item.turn ?? -0.35}>
      {visual.vessel === "cup" ? <Drink visual={visual} size={item.size ?? "M"} quality="high" /> : <Sundae visual={visual} flavour={item.flavour ?? "original"} quality="high" />}
    </group>
  );
}

export default function RenderStudio({
  visual,
  props,
  bg,
  size,
  turn = -0.35,
  flavour = "original",
  framing = "product",
  items,
  visuals,
  cameraZ,
  aspect = 1,
  horizontal = false,
}: {
  visual: ProductVisual | null;
  props: PropSpec[];
  bg: [string, string] | null;
  size?: string;
  turn?: number;
  flavour?: "original" | "matcha";
  framing?: "product" | "bubble";
  /** multi-product compositions (hero, banners) */
  items?: CompositionItem[];
  visuals?: Record<string, ProductVisual>;
  cameraZ?: number;
  aspect?: number;
  /** banner mode: horizontal gradient, shadows only (no floor colour) */
  horizontal?: boolean;
}) {
  const height = visual?.vessel === "cup" ? (CUP_HEIGHT[size ?? "M"] ?? 2.45) : visual?.vessel === "sundae" ? 1.75 : 2.6;
  // centre each vessel so its base sits on the floor
  const productY = useMemo(() => {
    if (!visual) return 0;
    if (visual.vessel === "cup") return FLOOR + height / 2;
    if (visual.vessel === "sundae") return FLOOR + 0.9;
    return 0; // cones are placed in their stands below
  }, [visual, height]);

  return (
    <Canvas
      dpr={1}
      shadows
      gl={{ antialias: true, alpha: !bg, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}
      camera={framing === "bubble" ? { position: [0, 0.6, 5.2], fov: 26 } : { position: [0, 0.65, cameraZ ?? 10.3], fov: aspect > 1 ? 24 : 26 }}
      onCreated={({ camera }) => camera.lookAt(0, framing === "bubble" ? -0.95 : -0.1, 0)}
      style={{ width: "100%", height: "100%" }}
    >
      <Backdrop bg={bg} horizontal={horizontal} />
      <Suspense fallback={null}>
        <Lights />
        {visual && (
          <group position-y={productY} rotation-y={turn}>
            {visual.vessel === "cup" && <Drink visual={visual} size={size ?? "M"} quality="high" />}
            {visual.vessel === "sundae" && <Sundae visual={visual} flavour={flavour} quality="high" />}
            {visual.vessel === "cone" && (
              // the two flavours side by side, each in a stand
              <>
                <ConeStand position={[-0.85, FLOOR, 0]} />
                <Cone serve="original" position={[-0.85, FLOOR + 1.84, 0]} />
                <ConeStand position={[0.85, FLOOR, -0.3]} />
                <Cone serve="matcha" position={[0.85, FLOOR + 1.84, -0.3]} />
              </>
            )}
          </group>
        )}
        {items && visuals && items.map((it, i) => <Placed key={`it${i}`} item={it} visual={visuals[it.slug]} />)}
        {props.map((p, i) => (
          <Prop key={i} spec={p} />
        ))}
        <Floor color={bg && !horizontal ? bg[1] : null} />
        <CastShadows />
        <Ready />
      </Suspense>
    </Canvas>
  );
}
