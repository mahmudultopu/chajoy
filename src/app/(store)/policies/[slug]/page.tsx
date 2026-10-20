import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Markdown } from "@/lib/markdown";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [p] = await db.select().from(schema.contentPages).where(eq(schema.contentPages.slug, slug));
  return p ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, alternates: { canonical: `/policies/${p.slug}` }, robots: p.status === "draft" ? { index: false } : undefined } : { title: "Not found" };
}

export default async function PolicyPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <article className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Policies</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-forest-900">{p.title}</h1>
        {p.status === "draft" ? (
          <p className="mt-5 rounded-2xl bg-lemon-300/50 px-4 py-3 text-sm text-forest-900">
            <strong>Draft.</strong> This page is awaiting review by CHAJOY. Sections marked “to be confirmed” are not yet decided.
          </p>
        ) : (
          <p className="mt-3 text-sm text-forest-900/55">
            Last updated {p.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}
          </p>
        )}
        <div className="mt-8">
          <Markdown source={p.body} />
        </div>
      </div>
    </article>
  );
}
