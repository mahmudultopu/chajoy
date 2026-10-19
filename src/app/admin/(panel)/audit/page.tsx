import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata = { title: "Audit log" };

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 60);
  const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = like ? or(ilike(schema.auditLogs.summary, like), ilike(schema.auditLogs.action, like), ilike(schema.auditLogs.actorLabel, like)) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(schema.auditLogs).where(where).orderBy(desc(schema.auditLogs.createdAt)).limit(100).offset((page - 1) * 100),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLogs).where(where),
  ]);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-semibold text-forest-900">Audit log</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-sm py-2" placeholder="Search actions, people, summaries" />
        <button className="btn-ghost py-2">Search</button>
      </form>
      <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-forest-900/5">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-forest-900/10 text-xs uppercase tracking-wide text-forest-900/55">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-forest-900/5 align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-forest-900/60">{r.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Dhaka" })}</td>
                <td className="px-4 py-2.5">{r.actorLabel ?? r.actorType}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2.5">
                  {r.summary}
                  {r.diff && Object.keys(r.diff).length > 0 && (
                    <details className="mt-1 text-xs text-forest-900/60">
                      <summary className="cursor-pointer">details</summary>
                      <pre className="mt-1 max-w-xl overflow-x-auto whitespace-pre-wrap rounded-lg bg-cream-100 p-2">{JSON.stringify(r.diff, null, 2)}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm text-forest-900/60">
        <span>{n} entries</span>
        <span className="flex gap-2">
          {page > 1 && (
            <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="btn-ghost py-2">
              Newer
            </Link>
          )}
          {page * 100 < n && (
            <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="btn-ghost py-2">
              Older
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}
