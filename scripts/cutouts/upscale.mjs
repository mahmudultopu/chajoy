/**
 * Upscales small menu photos 4x with Swin2SR before they are cut out.
 * See scripts/cutouts/README.md.
 */

import { pipeline } from "@huggingface/transformers";
import sharp from "sharp";
import fs from "fs";
const [src, out, only, modelId = "Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const up = await pipeline("image-to-image", modelId, { dtype: "fp32" });
const want = only ? only.split(",") : null;
const files = fs.readdirSync(src).filter((f) => f.endsWith(".webp") && (!want || want.includes(f.replace(".webp", ""))) && !fs.existsSync(`${out}/${f.replace(".webp", ".png")}`));
for (const f of files) {
  const t0 = Date.now();
  const png = await sharp(`${src}/${f}`).removeAlpha().png().toBuffer();
  const res = await up(new Blob([png], { type: "image/png" }));
  const img = Array.isArray(res) ? res[0] : res;
  await sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: img.channels } }).png().toFile(`${out}/${f.replace(".webp", ".png")}`);
  console.log(f, img.width + "x" + img.height, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
