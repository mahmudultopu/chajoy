// Remove neutral near-white leftovers that touch the transparent area, and white baselines.
import sharp from "sharp";
import fs from "fs";
const [src, out, minV = "232"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(src).filter((f) => f.endsWith(".webp"))) {
  const { data, info } = await sharp(`${src}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = (i) => { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; return Math.min(r, g, b) > +minV && Math.max(r, g, b) - Math.min(r, g, b) < 16; };
  const kill = new Uint8Array(w * h), st = [];
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    if (data[i * 4 + 3] < 40 || x === 0 || x === w - 1 || y === h - 1) { if (white(i) || data[i * 4 + 3] < 40) { kill[i] = data[i * 4 + 3] < 40 ? 2 : 1; st.push(i); } }
  }
  while (st.length) {
    const i = st.pop(), x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (kill[n] || !white(n)) continue;
      kill[n] = 1; st.push(n);
    }
  }
  // bottom 3%: drop near-white rows remnants
  for (let y = Math.floor(h * 0.97); y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; if (Math.min(r, g, b) > 200) kill[i] = 1; }
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = kill[i] === 1 ? 0 : 255;
  const soft = await sharp(mask, { raw: { width: w, height: h, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer();
  let n = 0;
  for (let i = 0; i < w * h; i++) { const a = Math.min(data[i * 4 + 3], soft[i]); if (a < data[i * 4 + 3] - 30) n++; data[i * 4 + 3] = a; }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${out}/${f}`);
  console.log(f, n);
}
