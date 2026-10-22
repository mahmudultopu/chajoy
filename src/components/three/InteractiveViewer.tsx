/** Interactive 3D drink viewer on product pages (a labelled illustration). */

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ProductVisual } from "@/lib/db/schema";
import { CUP_HEIGHT, Cone, Drink, Sundae, type Quality } from "./models";
import { Studio } from "./Studio";
import type { SceneEnv } from "./SceneGate";

export type Hotspot = { id: string; label: string; detail: string; y: number; side?: 1 | -1 };

type Ctl = { angle: number; velocity: number; dragging: boolean; zoom: number; idleSince: number };

function Model({
  visual,
  size,
  temperature,
  flavour,
  quality,
  ctl,
  reduced,
  hotspots,
  els,
}: {
  visual: ProductVisual;
  size: string;
  temperature: "cold" | "hot";
  flavour: "original" | "matcha";
  quality: Quality;
  ctl: React.RefObject<Ctl>;
  reduced: boolean;
  hotspots: Hotspot[];
  els: React.RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const g = useRef<THREE.Group>(null);
  const pop = useRef(1);
  const { camera, size: view } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const height = visual.vessel === "cup" ? (CUP_HEIGHT[size] ?? 2.45) : 2.2;

  useEffect(() => {
    pop.current = 0.85; // little bounce when the size changes
  }, [size, flavour, temperature]);

  useFrame((state, dt) => {
    const c = ctl.current;
    if (!c.dragging) {
      c.angle += c.velocity;
      c.velocity *= Math.pow(0.04, dt);
      if (!reduced && performance.now() - c.idleSince > 2500) c.angle += dt * 0.35;
    }
    if (g.current) {
      g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, c.angle, 8, dt);
      pop.current = THREE.MathUtils.damp(pop.current, 1, 6, dt);
      g.current.scale.setScalar(pop.current);
    }
    const z = 7.4 / c.zoom;
    camera.position.lerp(tmp.set(0, 0.25, z), 1 - Math.pow(0.002, dt));
    camera.lookAt(0, 0, 0);
    // project hotspot anchors to screen space and move their DOM markers
    for (const h of hotspots) {
      const el = els.current[h.id];
      if (!el) continue;
      tmp.set((h.side ?? 1) * 1.05, h.y * height - height / 2, 0.6).project(camera);
      el.style.transform = `translate(${((tmp.x + 1) / 2) * view.width}px, ${((1 - tmp.y) / 2) * view.height}px)`;
      el.style.opacity = "1";
    }
    void state;
  });

  return (
    <group>
      <group ref={g}>
        {visual.vessel === "cup" && <Drink visual={visual} size={size} temperature={temperature} quality={quality} />}
        {visual.vessel === "cone" && (
          <group position-y={0.25}>
            <Cone serve={flavour === "matcha" ? "matcha" : visual.serve ?? "twist"} />
          </group>
        )}
        {visual.vessel === "sundae" && <Sundae visual={visual} flavour={flavour} quality={quality} />}
      </group>
    </group>
  );
}

/** Rotatable 3D model of the drink that follows the chosen size and options. */
export default function InteractiveViewer({
  env,
  visual,
  size = "M",
  temperature = "cold",
  flavour = "original",
  hotspots = [],
  label = "3D illustration — not an official photo",
  background,
}: {
  env: SceneEnv;
  visual: ProductVisual;
  size?: string;
  temperature?: "cold" | "hot";
  flavour?: "original" | "matcha";
  hotspots?: Hotspot[];
  label?: string;
  /** solid backdrop colour; glass refraction needs something in-scene to refract */
  background?: string;
}) {
  const ctl = useRef<Ctl>({ angle: -0.4, velocity: 0, dragging: false, zoom: 1, idleSince: 0 });
  const last = useRef<{ x: number; t: number } | null>(null);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const els = useRef<Record<string, HTMLDivElement | null>>({});
  const [zoom, setZoom] = useState(1);
  const quality: Quality = env.quality;
  const dpr = useMemo<[number, number]>(() => (quality === "high" ? [1, 1.75] : quality === "medium" ? [1, 1.4] : [1, 1]), [quality]);

  const setZ = (z: number) => {
    const v = Math.min(1.8, Math.max(0.9, z));
    ctl.current.zoom = v;
    setZoom(v);
  };

  return (
    <div className="relative h-full w-full">
      <div
        className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
        onPointerDown={(e) => {
          ctl.current.dragging = true;
          ctl.current.velocity = 0;
          last.current = { x: e.clientX, t: performance.now() };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!ctl.current.dragging || !last.current) return;
          const dx = e.clientX - last.current.x;
          ctl.current.angle += dx * 0.012;
          ctl.current.velocity = dx * 0.012 * 0.6;
          last.current = { x: e.clientX, t: performance.now() };
        }}
        onPointerUp={() => {
          ctl.current.dragging = false;
          ctl.current.idleSince = performance.now();
        }}
        onPointerCancel={() => {
          ctl.current.dragging = false;
        }}
        onDoubleClick={() => setZ(zoom > 1.2 ? 1 : 1.55)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") ctl.current.angle -= 0.35;
          if (e.key === "ArrowRight") ctl.current.angle += 0.35;
          if (e.key === "+" || e.key === "=") setZ(zoom + 0.25);
          if (e.key === "-") setZ(zoom - 0.25);
          ctl.current.idleSince = performance.now();
        }}
        tabIndex={0}
        role="img"
        aria-label={`Interactive 3D illustration. Drag or use arrow keys to rotate, plus and minus to zoom.`}
      >
        <Canvas
          dpr={dpr}
          frameloop={env.active ? "always" : "never"}
          camera={{ position: [0, 0.25, 7.4], fov: 30 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        >
          {background && <color attach="background" args={[background]} />}
          <Suspense fallback={null}>
            <Studio low={quality === "low"} shadowY={visual.vessel === "cone" ? -1.95 : -1.55} />
            <Model
              visual={visual}
              size={size}
              temperature={temperature}
              flavour={flavour}
              quality={quality}
              ctl={ctl}
              reduced={env.reducedMotion}
              hotspots={hotspots}
              els={els}
            />
          </Suspense>
        </Canvas>
      </div>
      {hotspots.map((h) => (
        <div
          key={h.id}
          ref={(el) => {
            els.current[h.id] = el;
          }}
          className="absolute left-0 top-0 z-10 opacity-0 transition-opacity"
          style={{ willChange: "transform" }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setOpenHotspot(openHotspot === h.id ? null : h.id)}
              className="grid size-8 place-items-center rounded-full bg-white/95 text-forest-900 shadow-lift ring-4 ring-matcha-300/50 transition hover:scale-110"
              aria-expanded={openHotspot === h.id}
              aria-label={h.label}
            >
              <Plus className={`size-4 transition ${openHotspot === h.id ? "rotate-45" : ""}`} />
            </button>
            {openHotspot === h.id && (
              <div role="tooltip" className={`absolute top-1/2 w-52 -translate-y-1/2 rounded-2xl bg-white p-3 text-left shadow-lift ring-1 ring-forest-900/10 ${(h.side ?? 1) > 0 ? "left-10" : "right-10"}`}>
                <p className="text-sm font-semibold text-forest-900">{h.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-forest-900/70">{h.detail}</p>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-forest-900 ring-1 ring-forest-900/10 backdrop-blur">
        {label}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        <button type="button" onClick={() => setZ(zoom - 0.25)} className="grid size-9 place-items-center rounded-full bg-white/90 shadow-soft ring-1 ring-forest-900/10" aria-label="Zoom out">
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => setZ(zoom + 0.25)} className="grid size-9 place-items-center rounded-full bg-white/90 shadow-soft ring-1 ring-forest-900/10" aria-label="Zoom in">
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            ctl.current.angle = -0.4;
            setZ(1);
          }}
          className="grid size-9 place-items-center rounded-full bg-white/90 shadow-soft ring-1 ring-forest-900/10"
          aria-label="Reset view"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
