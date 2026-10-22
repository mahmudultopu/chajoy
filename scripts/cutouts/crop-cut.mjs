// Crop regions out of official CHAJOY posters and remove the background (RMBG-1.4),
// keeping only the largest connected object in each crop.
import { AutoModel, AutoProcessor, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import fs from "fs";
const [jobsFile, out] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
fs.mkdirSync(out, { recursive: true });
const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", { config: { model_type: "custom" }, dtype: "fp32" });
const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", { config: { do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5], feature_extractor_type: "ImageFeatureExtractor", image_std: [1, 1, 1], resample: 2, rescale_factor: 1 / 255, size: { width: 1024, height: 1024 } } });
for (const j of jobs) {
  const [l, t, w, h] = j.crop;
  const big = await sharp(j.src).extract({ left: l, top: t, width: w, height: h }).removeAlpha().png().toBuffer();
  const image = await RawImage.fromBlob(new Blob([big], { type: "image/png" }));
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(w, h);
  const a = Buffer.from(mask.data);
  // largest connected component of alpha > 100
  const lab = new Int32Array(w * h); let best = 0, bestN = 0, cur = 0;
  for (let i = 0; i < w * h; i++) {
    if (lab[i] || a[i] <= 100) continue;
    cur++; let n = 0; const st = [i]; lab[i] = cur;
    while (st.length) { const k = st.pop(); n++; const x = k % w, y = (k / w) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!lab[q] && a[q] > 100) { lab[q] = cur; st.push(q); } } }
    if (n > bestN) { bestN = n; best = cur; }
  }
  // keep the component plus its soft edge (pixels within 3px of it)
  const keep = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) keep[i] = lab[i] === best ? 255 : 0;
  const grown = await sharp(keep, { raw: { width: w, height: h, channels: 1 } }).dilate(3).blur(0.8).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < w * h; i++) a[i] = Math.min(a[i], grown[i]);
  const rgba = await sharp(big).joinChannel(a, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  await sharp(rgba).trim({ threshold: 1 }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${out}/${j.name}.webp`);
  const m = await sharp(`${out}/${j.name}.webp`).metadata();
  console.log(j.name, m.width + "x" + m.height);
}
