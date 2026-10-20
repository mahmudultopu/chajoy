"use client";

import dynamic from "next/dynamic";
import type { ProductVisual } from "@/lib/db/schema";
import { BUBBLE_PRESETS, COMPOSITIONS, RENDER_PRESETS } from "@/components/three/render-presets";

const RenderStudio = dynamic(() => import("@/components/three/RenderStudio"), { ssr: false });

export function RenderClient({
  slug,
  visual,
  visuals,
  width,
  flavour,
}: {
  slug: string;
  visual: ProductVisual | null;
  visuals: Record<string, ProductVisual>;
  width: number;
  flavour: "original" | "matcha";
}) {
  const bubble = BUBBLE_PRESETS[slug];
  const preset = RENDER_PRESETS[slug];
  const comp = COMPOSITIONS[slug];
  const height = comp ? Math.round((width * comp.height) / comp.width) : width;
  return (
    <div id="stage" style={{ width, height, margin: 0 }}>
      {/* transparent page so bubble/composition renders keep their alpha channel */}
      <style>{`html,body{background:transparent!important;margin:0}`}</style>
      {comp ? (
        <RenderStudio visual={null} props={comp.props} bg={comp.bg} horizontal items={comp.items} visuals={visuals} cameraZ={comp.cameraZ} aspect={comp.width / comp.height} />
      ) : bubble ? (
        <RenderStudio visual={null} props={bubble} bg={null} framing="bubble" />
      ) : (
        <RenderStudio visual={visual} props={preset?.props ?? []} bg={preset?.bg ?? ["#f4f1e6", "#d9e7b8"]} size={preset?.size} turn={preset?.turn} flavour={flavour} />
      )}
    </div>
  );
}
