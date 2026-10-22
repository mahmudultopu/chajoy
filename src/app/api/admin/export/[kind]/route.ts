/** API: CSV export for admins. */

import { requireAdmin } from "@/lib/auth/admin";
import { exportCsv, type ImportKind } from "@/lib/csv-import";
import { audit } from "@/lib/audit";
import { handle, HttpError } from "@/lib/http";

/** Always run per request: the response depends on cookies or the query. */
export const dynamic = "force-dynamic";

/** Downloads products, branches or inventory as CSV. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ kind: string }> }) => {
  const admin = await requireAdmin("imports.manage");
  const kind = (await ctx.params).kind.replace(/\.csv$/, "") as ImportKind;
  if (!["products", "branches", "inventory"].includes(kind)) throw new HttpError(404, "Unknown export.");
  const body = await exportCsv(kind);
  await audit({ type: "admin", id: admin.id, label: admin.email }, { action: `export.${kind}`, entityType: "export", entityId: kind, summary: `Exported ${kind} CSV` });
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chajoy-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
