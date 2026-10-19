"use client";

import * as THREE from "three";

// Procedural textures drawn on <canvas>: no image downloads, and they're
// cached per page so every cup shares them.

const cache = new Map<string, THREE.Texture>();

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
}

function toTexture(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(...opts.repeat);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Height map -> tangent-space normal map. */
function heightToNormal(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/** Condensation droplets on a cold cup: returns { normal, roughness }. */
export function condensationMaps() {
  if (cache.has("cond-n")) return { normal: cache.get("cond-n")!, roughness: cache.get("cond-r")! };
  const W = 512;
  const H = 512;
  const rand = seeded(7);
  const [hc, hx] = canvas(W, H);
  const [rc, rx] = canvas(W, H);
  hx.fillStyle = "#000";
  hx.fillRect(0, 0, W, H);
  rx.fillStyle = "#5a5a5a"; // misted plastic between drops
  rx.fillRect(0, 0, W, H);
  const drop = (x: number, y: number, r: number, stretch = 1) => {
    for (const [ox, oy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) {
      const g = hx.createRadialGradient(x + ox, y + oy - r * 0.25, 0, x + ox, y + oy, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.7, "rgba(200,200,200,.8)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      hx.save();
      hx.translate(x + ox, y + oy);
      hx.scale(1, stretch);
      hx.translate(-(x + ox), -(y + oy));
      hx.fillStyle = g;
      hx.beginPath();
      hx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      hx.fill();
      hx.restore();
      rx.fillStyle = "#0c0c0c"; // water is glossy
      rx.beginPath();
      rx.ellipse(x + ox, y + oy, r * 0.85, r * 0.85 * stretch, 0, 0, Math.PI * 2);
      rx.fill();
    }
  };
  for (let i = 0; i < 900; i++) drop(rand() * W, rand() * H, 1 + rand() * 2.2);
  for (let i = 0; i < 160; i++) drop(rand() * W, rand() * H, 3 + rand() * 5, 1 + rand() * 0.4);
  for (let i = 0; i < 14; i++) {
    // a few runs where drops slid down
    const x = rand() * W;
    let y = rand() * H * 0.6;
    const len = 40 + rand() * 120;
    for (let k = 0; k < len; k += 3) drop(x + Math.sin(k * 0.08) * 1.5, y + k, 2.2 + rand() * 0.6);
    drop(x, y + len, 6 + rand() * 3, 1.3);
    y += len;
  }
  heightToNormal(hx, W, H, 3.2);
  const normal = toTexture(hc, { repeat: [3, 2] });
  const roughness = toTexture(rc, { repeat: [3, 2] });
  cache.set("cond-n", normal);
  cache.set("cond-r", roughness);
  return { normal, roughness };
}

/** Milk tea body with brown-sugar "tiger" streaks running down the cup wall. */
export function tigerStripeTexture(base: string, syrup: string, key = "") {
  const id = `tiger-${base}-${syrup}-${key}`;
  if (cache.has(id)) return cache.get(id)!;
  const W = 1024;
  const H = 512;
  const rand = seeded(base.length * 31 + syrup.length);
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, base);
  g.addColorStop(0.72, base);
  g.addColorStop(1, syrup);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // v=0 is the bottom of the lathe, canvas y=0 is the top of the image -> streaks flow toward canvas bottom
  x.globalCompositeOperation = "multiply";
  for (let i = 0; i < 34; i++) {
    const sx = rand() * W;
    const top = rand() * H * 0.35;
    const width = 6 + rand() * 26;
    x.strokeStyle = syrup;
    x.globalAlpha = 0.35 + rand() * 0.45;
    x.lineCap = "round";
    x.lineWidth = width;
    x.beginPath();
    x.moveTo(sx, top);
    const bend = (rand() - 0.5) * 120;
    x.bezierCurveTo(sx + bend, top + H * 0.3, sx - bend, top + H * 0.55, sx + bend * 0.4, H);
    x.stroke();
    x.lineWidth = width * 0.35;
    x.globalAlpha *= 0.6;
    x.beginPath();
    x.moveTo(sx + width, top + 20);
    x.bezierCurveTo(sx + bend + width, top + H * 0.4, sx - bend, top + H * 0.6, sx + bend, H);
    x.stroke();
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const t = toTexture(c, { srgb: true });
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.flipY = true;
  cache.set(id, t);
  return t;
}

/** Vertical gradient (for fruit teas & layered shakes). */
export function gradientTexture(top: string, bottom: string, split = 0.5) {
  const id = `grad-${top}-${bottom}-${split}`;
  if (cache.has(id)) return cache.get(id)!;
  const [c, x] = canvas(8, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(Math.max(0, split - 0.12), top);
  g.addColorStop(Math.min(1, split + 0.12), bottom);
  g.addColorStop(1, bottom);
  x.fillStyle = g;
  x.fillRect(0, 0, 8, 256);
  const t = toTexture(c, { srgb: true });
  t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(id, t);
  return t;
}

/** White "CHA JOY" print as seen on CHAJOY cups (illustrative). */
export function cupPrintTexture() {
  if (cache.has("print")) return cache.get("print")!;
  const [c, x] = canvas(512, 512);
  x.clearRect(0, 0, 512, 512);
  x.fillStyle = "#ffffff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "800 128px 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";
  x.fillText("CHA", 256, 190);
  x.fillText("JOY", 256, 320);
  x.font = "700 30px system-ui, sans-serif";
  x.fillText("ICE CREAM AND TEA", 256, 420);
  const t = toTexture(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set("print", t);
  return t;
}

/** Citrus cross-section for lemon / lime slices. */
export function citrusTexture(kind: "lemon" | "lime") {
  const id = `citrus-${kind}`;
  if (cache.has(id)) return cache.get(id)!;
  const S = 512;
  const [c, x] = canvas(S, S);
  const rind = kind === "lemon" ? "#f2cc2e" : "#6aa524";
  const pith = kind === "lemon" ? "#fff6cf" : "#eef7d4";
  const flesh = kind === "lemon" ? "#f7e27a" : "#c9e27a";
  const fleshDark = kind === "lemon" ? "#efd257" : "#b2d35a";
  x.fillStyle = rind;
  x.fillRect(0, 0, S, S);
  x.fillStyle = pith;
  x.beginPath();
  x.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2);
  x.fill();
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 + 0.03;
    const a1 = ((i + 1) / segs) * Math.PI * 2 - 0.03;
    const g = x.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.42);
    g.addColorStop(0, fleshDark);
    g.addColorStop(1, flesh);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(S / 2 + Math.cos((a0 + a1) / 2) * S * 0.04, S / 2 + Math.sin((a0 + a1) / 2) * S * 0.04);
    x.arc(S / 2, S / 2, S * 0.42, a0, a1);
    x.closePath();
    x.fill();
    // juice vesicles
    x.strokeStyle = "rgba(255,255,255,.35)";
    x.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const a = a0 + ((a1 - a0) * (k + 0.5)) / 9;
      x.beginPath();
      x.moveTo(S / 2 + Math.cos(a) * S * 0.12, S / 2 + Math.sin(a) * S * 0.12);
      x.lineTo(S / 2 + Math.cos(a) * S * 0.38, S / 2 + Math.sin(a) * S * 0.38);
      x.stroke();
    }
  }
  x.fillStyle = pith;
  x.beginPath();
  x.arc(S / 2, S / 2, S * 0.035, 0, Math.PI * 2);
  x.fill();
  const t = toTexture(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(id, t);
  return t;
}

/** Waffle cone pattern (colour + bump). */
export function waffleTextures() {
  if (cache.has("waffle-c")) return { map: cache.get("waffle-c")!, bump: cache.get("waffle-b")! };
  const S = 256;
  const [c, x] = canvas(S, S);
  const [b, bx] = canvas(S, S);
  x.fillStyle = "#d9a35c";
  x.fillRect(0, 0, S, S);
  bx.fillStyle = "#fff";
  bx.fillRect(0, 0, S, S);
  const step = S / 6;
  for (const ctx of [x, bx]) {
    ctx.strokeStyle = ctx === x ? "#a8692c" : "#202020";
    ctx.lineWidth = ctx === x ? 7 : 9;
    for (let i = -6; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step + S, S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * step, S);
      ctx.lineTo(i * step + S, 0);
      ctx.stroke();
    }
  }
  const map = toTexture(c, { srgb: true, repeat: [5, 3] });
  const bump = toTexture(b, { repeat: [5, 3] });
  cache.set("waffle-c", map);
  cache.set("waffle-b", bump);
  return { map, bump };
}

/** Strawberry seeds as a tiny bump pattern. */
export function seedBumpTexture() {
  if (cache.has("seeds")) return cache.get("seeds")!;
  const S = 256;
  const [c, x] = canvas(S, S);
  x.fillStyle = "#808080";
  x.fillRect(0, 0, S, S);
  const rand = seeded(3);
  for (let i = 0; i < 140; i++) {
    const px = rand() * S;
    const py = rand() * S;
    x.fillStyle = "#202020";
    x.beginPath();
    x.ellipse(px, py, 4, 6, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#f0f0f0";
    x.beginPath();
    x.ellipse(px, py, 1.6, 2.6, 0, 0, Math.PI * 2);
    x.fill();
  }
  const t = toTexture(c, { repeat: [2, 1] });
  cache.set("seeds", t);
  return t;
}
