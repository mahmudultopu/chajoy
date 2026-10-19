"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, PerformanceMonitor } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CitrusSlice, Cone, Drink, Droplet, IceCube, Pearl, Strawberry, TeaLeaf, type Quality } from "./models";
import { Studio } from "./Studio";
import type { SceneEnv } from "./SceneGate";
import type { ProductVisual } from "@/lib/db/schema";

const BOBA: ProductVisual = { vessel: "cup", liquid: "#CFA77C", stripes: "#6B3A1A", pearls: true, ice: true };

/**
 * The hero is two canvases with the headline between them:
 *  - "back": far garnish, rendered small and blurred with CSS (a cheap,
 *    transparency-friendly depth of field), sitting behind the type
 *  - "front": the cup, cone and near garnish, sharp and in front of the type
 * Both share one scroll progress value and track the pointer over the hero.
 */
type Layer = "front" | "back";
type Prog = { current: number };
const shared: { progress: Prog } = { progress: { current: 0 } };

function MaybeFloat({ reduced, children, speed = 1.4, i = 0 }: { reduced: boolean; children: React.ReactNode; speed?: number; i?: number }) {
  if (reduced) return <>{children}</>;
  return (
    <Float speed={speed} rotationIntensity={0.9} floatIntensity={0.9} floatingRange={[-0.08 - i * 0.01, 0.1]}>
      {children}
    </Float>
  );
}

function Rig({ reduced, depth }: { reduced: boolean; depth: number }) {
  const { camera, pointer, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const p = shared.progress.current;
    const narrow = size.width < 768;
    const baseZ = narrow ? 9.4 : 7.6;
    // the back layer moves less: classic parallax
    const px = reduced ? 0 : pointer.x * 0.55 * depth;
    const py = reduced ? 0 : pointer.y * 0.3 * depth;
    target.set(px, 0.15 + py - p * 0.6, baseZ + p * 1.6);
    camera.position.lerp(target, 1 - Math.pow(0.001, dt));
    camera.lookAt(0, 0.1 - p * 0.4, 0);
  });
  return null;
}

function Front({ reduced, quality }: { reduced: boolean; quality: Quality }) {
  const cup = useRef<THREE.Group>(null);
  const cone = useRef<THREE.Group>(null);
  const garnish = useRef<THREE.Group>(null);
  const { size } = useThree();
  const narrow = size.width < 768;

  useFrame((state, dt) => {
    const p = shared.progress.current;
    const t = state.clock.elapsedTime;
    if (cup.current) {
      cup.current.rotation.y = (reduced ? -0.35 : -0.35 + Math.sin(t * 0.35) * 0.35) + p * Math.PI * 0.9;
      cup.current.position.y = -p * 0.4;
    }
    if (cone.current) {
      cone.current.rotation.y += reduced ? 0 : dt * 0.25;
      cone.current.position.x = (narrow ? 1.55 : 2.55) + p * 1.2;
    }
    if (garnish.current) garnish.current.scale.setScalar(1 + p * 0.55);
  });

  return (
    <group position-y={narrow ? -0.05 : 0}>
      <group ref={cup} scale={narrow ? 0.9 : 1.18}>
        <MaybeFloat reduced={reduced} speed={1.1}>
          <Drink visual={BOBA} size="M" quality={quality} straw />
        </MaybeFloat>
      </group>

      <group ref={cone} position={[narrow ? 1.55 : 2.55, -0.25, -1.2]} rotation={[0.1, 0, -0.2]} scale={narrow ? 0.62 : 0.78}>
        <MaybeFloat reduced={reduced} speed={1.6}>
          <Cone serve="twist" />
        </MaybeFloat>
      </group>

      <group ref={garnish}>
        <MaybeFloat reduced={reduced} i={1}>
          <CitrusSlice kind="lemon" position={narrow ? [-1.45, 1.9, 0.4] : [-2.6, 1.45, 0.3]} rotation={[0.6, 0.5, 0.2]} />
        </MaybeFloat>
        <MaybeFloat reduced={reduced} i={2} speed={1.8}>
          <CitrusSlice kind="lime" radius={0.32} position={narrow ? [1.5, -1.9, 0.6] : [2.1, -1.55, 1.1]} rotation={[-0.4, -0.6, 0.4]} />
        </MaybeFloat>
        <MaybeFloat reduced={reduced} i={3}>
          <Strawberry scale={0.5} position={narrow ? [-1.55, -1.8, 0.7] : [-3.1, -0.35, 0.3]} rotation={[0.3, 0.6, -0.5]} />
        </MaybeFloat>
        {quality !== "low" && (
          <>
            <MaybeFloat reduced={reduced} i={4} speed={2}>
              <IceCube size={0.42} quality={quality} position={narrow ? [1.3, 1.95, 0.2] : [1.7, 1.55, 1]} rotation={[0.4, 0.7, 0.2]} />
            </MaybeFloat>
            <MaybeFloat reduced={reduced} i={5} speed={1.7}>
              <IceCube size={0.3} quality={quality} position={[-1.25, -0.2, 1.7]} rotation={[0.9, 0.2, 0.5]} />
            </MaybeFloat>
            <MaybeFloat reduced={reduced} i={6} speed={2.2}>
              <Pearl position={[-0.95, 1.85, 1.2]} />
            </MaybeFloat>
            <MaybeFloat reduced={reduced} i={7} speed={2.4}>
              <Pearl position={[1.05, -0.95, 1.9]} scale={0.8} />
            </MaybeFloat>
            {[[-0.7, 1.4, 1.6], [0.9, 0.9, 1.7], [0.55, -1.3, 1.6]].map((p, i) => (
              <MaybeFloat key={i} reduced={reduced} i={11 + i} speed={2.6}>
                <Droplet position={p as [number, number, number]} scale={0.8 + i * 0.15} />
              </MaybeFloat>
            ))}
          </>
        )}
      </group>
    </group>
  );
}

function Back({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.scale.setScalar(1 + shared.progress.current * 0.3);
  });
  return (
    <group ref={g} position-z={-3}>
      <MaybeFloat reduced={reduced} i={1} speed={1.2}>
        <Pearl position={[-4.6, 1.6, 0]} scale={1.6} />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={2} speed={1.5}>
        <Pearl position={[4.9, -1.2, 0]} scale={1.3} />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={3} speed={1.3}>
        <TeaLeaf position={[-1.8, 2.6, 0]} rotation={[0.4, 0.3, 0.9]} scale={1.4} />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={4} speed={1.1}>
        <TeaLeaf position={[4.4, 2.3, 0]} rotation={[-0.3, 0.8, -0.6]} color="#7fae36" scale={1.2} />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={5} speed={1.6}>
        <IceCube position={[-3.6, -2.2, 0]} size={0.6} rotation={[0.5, 0.4, 0.3]} quality="medium" />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={6} speed={1.4}>
        <CitrusSlice kind="lime" position={[3.1, 0.6, -1]} radius={0.5} rotation={[1.1, 0.2, 0.4]} />
      </MaybeFloat>
      <MaybeFloat reduced={reduced} i={7} speed={1.9}>
        <Pearl position={[-2.8, -0.4, -1]} scale={1.1} />
      </MaybeFloat>
    </group>
  );
}

export default function HeroScene({ env, triggerId, layer = "front" }: { env: SceneEnv; triggerId: string; layer?: Layer }) {
  const [quality, setQuality] = useState<Quality>(env.quality);
  const dpr = useMemo<[number, number]>(() => {
    if (layer === "back") return [0.6, 0.9]; // it's blurred anyway
    return quality === "high" ? [1, 1.75] : quality === "medium" ? [1, 1.4] : [1, 1];
  }, [quality, layer]);

  useEffect(() => {
    if (env.reducedMotion || layer === "back") return;
    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: `#${triggerId}`,
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
      onUpdate: (self) => {
        shared.progress.current = self.progress;
      },
    });
    return () => st.kill();
  }, [env.reducedMotion, triggerId, layer]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={env.active ? "always" : "never"}
      camera={{ position: [0, 0.2, 7.6], fov: 32 }}
      // the canvas ignores the pointer (so buttons over it work); track it on the whole hero instead
      eventSource={typeof document !== "undefined" ? (document.getElementById(triggerId) ?? undefined) : undefined}
      eventPrefix="client"
      gl={{ antialias: layer === "front", alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ background: "transparent" }}
      aria-hidden
    >
      {layer === "front" && <PerformanceMonitor onDecline={() => setQuality((q) => (q === "high" ? "medium" : "low"))} />}
      <Suspense fallback={null}>
        <Studio low={quality === "low" || layer === "back"} shadowY={-1.75} shadowOpacity={layer === "front" ? 0.35 : 0} />
        {layer === "front" ? <Front reduced={env.reducedMotion} quality={quality} /> : <Back reduced={env.reducedMotion} />}
        <Rig reduced={env.reducedMotion} depth={layer === "front" ? 1 : 0.45} />
      </Suspense>
    </Canvas>
  );
}
