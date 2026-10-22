/**
 * Decides whether 3D can run (WebGL, lite mode, reduced motion) and renders a
 * fallback when it can't.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import type { Quality } from "./models";

export type SceneEnv = { active: boolean; reducedMotion: boolean; quality: Quality };

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "low";
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = window.matchMedia("(max-width: 767px)").matches;
  if (cores <= 4 && mem <= 3) return "low";
  if (small || cores <= 6 || mem <= 4) return "medium";
  return "high";
}

/**
 * Decides whether a 3D scene runs at all, and how well:
 *  - mounts only when scrolled near (so 3D never blocks first paint)
 *  - pauses rendering when off-screen
 *  - falls back to the static photo when WebGL is missing, Lite mode is on,
 *    or the device looks too weak
 *  - passes reduced-motion through so scenes stop auto-animating
 */
export function SceneGate({
  fallback,
  children,
  className,
  allowLow = true,
}: {
  fallback: React.ReactNode;
  children: (env: SceneEnv) => React.ReactNode;
  className?: string;
  allowLow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { liteMode } = useStore();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [support, setSupport] = useState<{ webgl: boolean; quality: Quality; reduced: boolean } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSupport({ webgl: detectWebGL(), quality: detectQuality(), reduced: mq.matches });
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin: "300px" });
    const vis = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.01 });
    near.observe(el);
    vis.observe(el);
    return () => {
      near.disconnect();
      vis.disconnect();
    };
  }, []);

  const use3d = support && support.webgl && !liteMode && (allowLow || support.quality !== "low");
  return (
    <div ref={ref} className={className}>
      {use3d && mounted ? children({ active, reducedMotion: support.reduced, quality: support.quality }) : fallback}
    </div>
  );
}
