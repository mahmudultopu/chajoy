import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HttpError } from "@/lib/errors";
import { randomCode } from "@/lib/tokens";

// Image uploads from the admin. Every image is re-encoded with sharp (which
// also strips metadata such as GPS) and stored as WebP.
//
// STORAGE_DRIVER=local    -> files in UPLOAD_DIR (default .data/uploads), served at /media/...
// STORAGE_DRIVER=supabase -> Supabase Storage bucket (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET)
//
// Use "supabase" (or another object store) on serverless hosts, where the
// local disk is not persistent.

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function uploadDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? ".data/uploads");
}

export async function saveImage(file: File, folder: "products" | "branches" | "promotions") {
  if (!ALLOWED.has(file.type)) throw new HttpError(415, "Upload a JPEG, PNG, WebP or AVIF image.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Images must be 8 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  let meta: { width: number; height: number };
  try {
    const r = await sharp(input, { failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    out = r.data;
    meta = r.info;
  } catch {
    throw new HttpError(422, "That file isn't a readable image.");
  }
  const name = `${folder}/${Date.now().toString(36)}-${randomCode(8).toLowerCase()}.webp`;

  if ((process.env.STORAGE_DRIVER ?? "local") === "supabase") {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
    if (!base || !key) throw new HttpError(500, "Supabase storage is not configured.");
    const res = await fetch(`${base}/storage/v1/object/${bucket}/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "x-upsert": "false" },
      body: new Uint8Array(out),
    });
    if (!res.ok) throw new HttpError(502, "Upload to storage failed.");
    return { url: `${base}/storage/v1/object/public/${bucket}/${name}`, width: meta.width, height: meta.height };
  }

  const target = path.join(uploadDir(), name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, out);
  return { url: `/media/${name}`, width: meta.width, height: meta.height };
}
