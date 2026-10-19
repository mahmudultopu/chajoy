import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { listBranches } from "@/lib/services/branches";
import { PromotionForm, type PromoInput } from "../PromotionForm";

export const metadata = { title: "Promotion" };

const dateStr = (d: Date) => new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("promotions.manage");
  const raw = (await params).id;
  const branches = (await listBranches()).map((b) => ({ id: b.id, name: b.name }));
  let input: PromoInput | null = null;
  if (raw !== "new") {
    const p = await db.query.promotions.findFirst({ where: eq(schema.promotions.id, Number(raw)), with: { rules: true } });
    if (!p) notFound();
    const r = p.rules[0];
    input = {
      id: p.id,
      title: p.title,
      description: p.description,
      terms: p.terms,
      startsAt: dateStr(p.startsAt),
      endsAt: dateStr(p.endsAt),
      isActive: p.isActive,
      rule: r ? { code: r.code, kind: r.kind, value: r.value, minSubtotalPaisa: r.minSubtotalPaisa, maxDiscountPaisa: r.maxDiscountPaisa, branchIds: r.branchIds ?? null, fulfilment: r.fulfilment, usageLimit: r.usageLimit, usedCount: r.usedCount } : null,
    };
  }
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/promotions" className="text-sm text-forest-900/60 hover:text-forest-900">
        ← Promotions
      </Link>
      <h1 className="font-display text-4xl font-semibold text-forest-900">{input ? input.title : "New promotion"}</h1>
      <PromotionForm p={input} branches={branches} />
    </div>
  );
}
