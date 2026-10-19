import { geocode } from "@/lib/geocode";
import { listBranches } from "@/lib/services/branches";
import { handle, json, limit } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  limit(req, "geocode", 20, 60_000);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return json({ results: [] });

  // Match our own branch areas first ("Rampura", "Mirpur 10"), no network needed.
  const branches = await listBranches();
  const local = branches
    .filter((b) => b.latitude !== null && (b.area.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(b.area.toLowerCase())))
    .map((b) => ({ label: `${b.area}, Dhaka (area of ${b.name})`, lat: b.latitude!, lng: b.longitude!, source: "branch-area" as const }));

  try {
    const remote = (await geocode(q)).map((r) => ({ ...r, source: "openstreetmap" as const }));
    return json({ results: [...local, ...remote].slice(0, 7), attribution: "© OpenStreetMap contributors" });
  } catch {
    return json({ results: local, error: local.length ? undefined : "Address search is unavailable right now. Try a nearby area name, or use your location." });
  }
});
