"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { PearlMaterial } from "./models";

// Extra garnish for the studio product renders (peach, guava, coconut,
// jasmine, matcha powder, chocolate, sugar cubes, spilled boba).

type GroupProps = ThreeElements["group"];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Peach: blushed sphere with a seam. */
export function Peach(props: GroupProps) {
  const map = useMemo(
    () =>
      canvasTex(256, 128, (x) => {
        const g = x.createLinearGradient(0, 0, 256, 0);
        g.addColorStop(0, "#f7b55a");
        g.addColorStop(0.35, "#f08a4b");
        g.addColorStop(0.55, "#e2553f");
        g.addColorStop(0.8, "#f19650");
        g.addColorStop(1, "#f7b55a");
        x.fillStyle = g;
        x.fillRect(0, 0, 256, 128);
        const r = seeded(4);
        for (let i = 0; i < 260; i++) {
          x.fillStyle = `rgba(255,${200 + r() * 40},120,${0.08 + r() * 0.1})`;
          x.fillRect(r() * 256, r() * 128, 2, 2);
        }
      }),
    [],
  );
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(0.42, 48, 32);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.z, v.x);
      const crease = Math.exp(-Math.pow(Math.sin(a) * 6, 2)) * 0.035 * (1 - Math.abs(v.y / 0.42));
      v.multiplyScalar(1 - crease / 0.42);
      v.y *= 0.95;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geom}>
        <meshPhysicalMaterial map={map} roughness={0.75} sheen={1} sheenColor="#ffd9b0" sheenRoughness={0.5} />
      </mesh>
      <mesh position={[0.03, 0.4, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.015, 0.02, 0.09, 8]} />
        <meshStandardMaterial color="#5a3b1e" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Half a guava: green rind, pink flesh, seeds. Cut face points +Y. */
export function GuavaHalf(props: GroupProps) {
  const face = useMemo(
    () =>
      canvasTex(256, 256, (x) => {
        x.fillStyle = "#7fae3a";
        x.fillRect(0, 0, 256, 256);
        x.fillStyle = "#f6e9c8";
        x.beginPath();
        x.arc(128, 128, 118, 0, Math.PI * 2);
        x.fill();
        const g = x.createRadialGradient(128, 128, 10, 128, 128, 110);
        g.addColorStop(0, "#e8536a");
        g.addColorStop(0.65, "#f07a83");
        g.addColorStop(1, "#f6b4a3");
        x.fillStyle = g;
        x.beginPath();
        x.arc(128, 128, 108, 0, Math.PI * 2);
        x.fill();
        const r = seeded(9);
        x.fillStyle = "#f8e7b0";
        for (let i = 0; i < 70; i++) {
          const a = r() * Math.PI * 2;
          const d = 18 + r() * 48;
          x.beginPath();
          x.ellipse(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 3, 4.5, a, 0, Math.PI * 2);
          x.fill();
        }
      }),
    [],
  );
  return (
    <group {...props}>
      <mesh rotation-x={Math.PI}>
        <sphereGeometry args={[0.42, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#8dbb46" roughness={0.55} clearcoat={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <circleGeometry args={[0.42, 48]} />
        <meshPhysicalMaterial map={face} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />
      </mesh>
    </group>
  );
}

/** Half a coconut: fibrous brown shell, white meat. Cut face points +Y. */
export function CoconutHalf(props: GroupProps) {
  const shell = useMemo(
    () =>
      canvasTex(256, 256, (x) => {
        x.fillStyle = "#6b4426";
        x.fillRect(0, 0, 256, 256);
        const r = seeded(13);
        for (let i = 0; i < 900; i++) {
          x.strokeStyle = `rgba(${150 + r() * 60},${100 + r() * 40},${60 + r() * 30},${0.25 + r() * 0.3})`;
          x.lineWidth = 1 + r();
          const sx = r() * 256;
          const sy = r() * 256;
          x.beginPath();
          x.moveTo(sx, sy);
          x.lineTo(sx + (r() - 0.5) * 10, sy + 8 + r() * 14);
          x.stroke();
        }
      }),
    [],
  );
  return (
    <group {...props}>
      <mesh rotation-x={Math.PI}>
        <sphereGeometry args={[0.45, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={shell} roughness={0.95} side={THREE.FrontSide} />
      </mesh>
      <mesh rotation-x={Math.PI} scale={0.985}>
        <sphereGeometry args={[0.45, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fbf8f0" roughness={0.6} side={THREE.BackSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <ringGeometry args={[0.39, 0.45, 48]} />
        <meshStandardMaterial color="#fffdf7" roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Small white jasmine flower. */
export function JasmineFlower(props: GroupProps) {
  const petal = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.07, 0.05, 0.08, 0.17, 0, 0.22);
    s.bezierCurveTo(-0.08, 0.17, -0.07, 0.05, 0, 0);
    const g = new THREE.ShapeGeometry(s, 10);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getY(i), 2) * 0.9);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group {...props}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} geometry={petal} rotation={[-1.2, 0, (i / 6) * Math.PI * 2]}>
          <meshPhysicalMaterial color="#fffdf5" roughness={0.45} sheen={1} sheenColor="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position-y={0.02}>
        <sphereGeometry args={[0.03, 12, 8]} />
        <meshStandardMaterial color="#f2d36b" />
      </mesh>
    </group>
  );
}

/** A soft mound of matcha powder. */
export function MatchaPowder(props: GroupProps) {
  const geom = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push(new THREE.Vector2(0.5 * (1 - t), 0.26 * Math.pow(Math.sin((t * Math.PI) / 2), 0.7)));
    }
    const g = new THREE.LatheGeometry(pts, 48);
    const p = g.attributes.position;
    const r = seeded(21);
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (r() - 0.5) * 0.012);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geom}>
        <meshStandardMaterial color="#7da33a" roughness={1} />
      </mesh>
    </group>
  );
}

/** Scattered chocolate chunks. */
export function ChocolateChunks({ count = 5, ...props }: { count?: number } & GroupProps) {
  const items = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: count }, () => ({ p: [(r() - 0.5) * 0.9, 0.06, (r() - 0.5) * 0.5] as [number, number, number], ry: r() * 3, s: 0.12 + r() * 0.08 }));
  }, [count]);
  return (
    <group {...props}>
      {items.map((c, i) => (
        <RoundedBox key={i} args={[c.s, c.s * 0.6, c.s * 1.3]} radius={0.015} position={c.p} rotation-y={c.ry}>
          <meshPhysicalMaterial color="#3b2014" roughness={0.35} clearcoat={0.4} />
        </RoundedBox>
      ))}
    </group>
  );
}

/** Sugar cubes. */
export function SugarCubes({ count = 3, ...props }: { count?: number } & GroupProps) {
  const items = useMemo(() => {
    const r = seeded(41);
    return Array.from({ length: count }, (_, i) => ({ p: [i * 0.22 - 0.2, 0.08 + (i === 1 ? 0.16 : 0), r() * 0.2] as [number, number, number], ry: r() * 2 }));
  }, [count]);
  return (
    <group {...props}>
      {items.map((c, i) => (
        <RoundedBox key={i} args={[0.17, 0.17, 0.17]} radius={0.02} position={c.p} rotation-y={c.ry}>
          <meshPhysicalMaterial color="#fffdf8" roughness={0.85} sheen={0.6} sheenColor="#ffffff" />
        </RoundedBox>
      ))}
    </group>
  );
}

/** Boba pearls spilled on the floor. */
export function PearlPile({ count = 22, spread = 0.9, seed = 3, ...props }: { count?: number; spread?: number; seed?: number } & GroupProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const r = seeded(seed);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.pow(r(), 0.7) * spread;
      d.position.set(Math.cos(a) * rad, 0.075 + (rad < spread * 0.3 ? r() * 0.12 : 0), Math.sin(a) * rad * 0.6);
      d.scale.setScalar(0.85 + r() * 0.3);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, spread, seed]);
  return (
    <group {...props}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.08, 20, 14]} />
        <PearlMaterial />
      </instancedMesh>
    </group>
  );
}
