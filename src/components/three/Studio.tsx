/** Shared lighting and environment for the 3D views. */

"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

/**
 * Soft studio lighting built from light cards (no HDR download): a big
 * overhead softbox, warm and green side strips for rim highlights on glass.
 */
export function Studio({ shadowY = -1.35, shadowOpacity = 0.45, tint = "#e7f5d0", low = false }: { shadowY?: number; shadowOpacity?: number; tint?: string; low?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} color="#fff8ea" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color={tint} />
      <Environment resolution={low ? 64 : 256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[-5, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} color="#fff3d6" />
        <Lightformer form="rect" intensity={2.5} position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} color={tint} />
        <Lightformer form="rect" intensity={1.2} position={[0, 0.5, -6]} scale={[12, 6, 1]} color="#f6f1e1" />
        <Lightformer form="ring" intensity={3} position={[2, 3, 6]} scale={1.6} />
      </Environment>
      {!low && <ContactShadows position={[0, shadowY, 0]} opacity={shadowOpacity} scale={8} blur={2.6} far={3.5} resolution={512} color="#10291a" />}
    </>
  );
}
