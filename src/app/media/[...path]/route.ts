import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/storage";

/** Serves admin-uploaded images stored on local disk (STORAGE_DRIVER=local). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path;
  const root = uploadDir();
  const file = path.resolve(/*turbopackIgnore: true*/ root, ...parts);
  // block path traversal and anything that isn't one of our webp files
  if (!file.startsWith(root + path.sep) || !file.endsWith(".webp")) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
