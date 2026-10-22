/** Admin: content management. */

import { db, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { getSettings } from "@/lib/services/settings";
import { listBranches } from "@/lib/services/branches";
import { AnnouncementForm, PageForm, SiteContentForm } from "./ContentForms";

/** Page title and search-engine settings. */
export const metadata = { title: "Content" };

const d = (x: Date | null) => (x ? new Date(x.getTime() + 6 * 3600_000).toISOString().slice(0, 10) : "");

/** Announcements, homepage copy and policy pages. */
export default async function ContentAdmin() {
  await requireAdminPage("content.manage");
  const [ann, settings, pages, branches] = await Promise.all([
    db.select().from(schema.announcements).orderBy(schema.announcements.sortOrder),
    getSettings(),
    db.select().from(schema.contentPages).orderBy(schema.contentPages.slug),
    listBranches(),
  ]);
  const b = branches.map((x) => ({ id: x.id, name: x.name }));
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl text-forest-900">Content</h1>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-forest-900">Announcement bar</h2>
        <p className="text-sm text-forest-900/60">Shown at the top of every page while active and inside its dates. Only announce real offers, launches and notices.</p>
        {ann.map((a) => (
          <AnnouncementForm key={a.id} a={{ ...a, startsAt: d(a.startsAt), endsAt: d(a.endsAt) }} branches={b} />
        ))}
        <AnnouncementForm a={null} branches={b} />
      </section>
      <SiteContentForm s={settings} />
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-forest-900">Policy pages</h2>
        {pages.map((p) => (
          <PageForm key={p.slug} page={p} />
        ))}
      </section>
    </div>
  );
}
