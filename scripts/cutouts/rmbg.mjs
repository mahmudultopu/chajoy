/**
 * Removes the background from product photos with the RMBG-1.4 model, then
 * clears leftover menu-board background connected to the image border.
 * See scripts/cutouts/README.md.
 */

import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";
import fs from "fs";
import path from "path";
env.allowLocalModels = false;
const [src, out, only, tol] = process.argv.slice(2);
const TOL = Number(tol ?? 24);
const GRAD = process.env.GRAD === "1";
fs.mkdirSync(out, { recursive: true });
const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", { config: { model_type: "custom" }, dtype: "fp32" });
const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
  config: { do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5], feature_extractor_type: "ImageFeatureExtractor", image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 } },
});
const files = fs.readdirSync(src).filter((f) => /\.(webp|png)$/.test(f) && (!only || only.split(",").some((o) => f.startsWith(o))));
for (const f of files) {
  const big = await sharp(path.join(src, f)).resize({ height: Number(process.env.HEIGHT ?? 960), kernel: "lanczos3" }).removeAlpha().png().toBuffer();
  const { width, height } = await sharp(big).metadata();
  const image = await RawImage.fromBlob(new Blob([big], { type: "image/png" }));
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(width, height);
  const alpha = Buffer.from(mask.data);
  // clear leftover menu background: flood from the border / already-transparent pixels,
  // only through pixels that match the border colour closely
  const { data: rgb } = await sharp(big).raw().toBuffer({ resolveWithObject: true });
  const border = [];
  for (let x = 0; x < width; x += 3) border.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y += 3) border.push(y * width, y * width + width - 1);
  const ref = [0, 1, 2].map((k) => border.map((i) => rgb[i * 3 + k]).sort((p, q) => p - q)[border.length >> 1]);
  const near = (i) => Math.abs(rgb[i * 3] - ref[0]) + Math.abs(rgb[i * 3 + 1] - ref[1]) + Math.abs(rgb[i * 3 + 2] - ref[2]) < TOL;
  const far = (i) => Math.abs(rgb[i * 3] - ref[0]) + Math.abs(rgb[i * 3 + 1] - ref[1]) + Math.abs(rgb[i * 3 + 2] - ref[2]);
  const paleGreen = (i) => { const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]; return g > 185 && g >= r + 6 && g >= b + 10 && r > 150; };
  const bg = new Uint8Array(width * height);
  const stack = [];
  for (let i = 0; i < width * height; i++) {
    const x = i % width, y = (i / width) | 0;
    const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    if ((edge || alpha[i] < 40) && (near(i) || (GRAD && paleGreen(i)))) { bg[i] = 1; stack.push(i); }
  }
  while (stack.length) {
    const i = stack.pop(), x = i % width, y = (i / width) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (bg[n]) continue;
      const step = Math.abs(rgb[i * 3] - rgb[n * 3]) + Math.abs(rgb[i * 3 + 1] - rgb[n * 3 + 1]) + Math.abs(rgb[i * 3 + 2] - rgb[n * 3 + 2]);
      if (!near(n) && !(GRAD && paleGreen(n))) continue;
      bg[n] = 1;
      stack.push(n);
    }
  }
  const keep = await sharp(Buffer.from(bg.map((v) => (v ? 0 : 255))), { raw: { width, height, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < alpha.length; i++) alpha[i] = Math.min(alpha[i], keep[i]);
  const rgba = await sharp(big).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
  await sharp(rgba).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(out, f.replace(/\.png$/, ".webp")));
  console.log("ok", f);
}
