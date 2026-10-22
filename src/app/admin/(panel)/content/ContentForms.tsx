/** Admin forms for announcements, homepage copy and content pages. */

"use client";

import { ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveAnnouncement, savePage, saveSiteContent } from "@/lib/admin/content-actions";
import type { SiteSettings } from "@/lib/services/settings";

type A = { id: number; message: string; linkUrl: string | null; linkLabel: string | null; branchId: number | null; startsAt: string; endsAt: string; isActive: boolean; sortOrder: number };

/** Creates or edits an announcement. */
export function AnnouncementForm({ a, branches }: { a: A | null; branches: { id: number; name: string }[] }) {
  return (
    <ActionForm action={saveAnnouncement} className="rounded-2xl bg-cream-100 p-4" resetOnSuccess={!a}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-6">
        <Field label="Message" className="sm:col-span-6">
          <input name="message" defaultValue={a?.message} className="input py-2" maxLength={160} required />
        </Field>
        <Field label="Link (optional)" className="sm:col-span-2">
          <input name="linkUrl" defaultValue={a?.linkUrl ?? ""} className="input py-2" placeholder="/menu or https://…" />
        </Field>
        <Field label="Link text" className="sm:col-span-2">
          <input name="linkLabel" defaultValue={a?.linkLabel ?? ""} className="input py-2" />
        </Field>
        <Field label="Only for branch" className="sm:col-span-2">
          <select name="branchId" defaultValue={a?.branchId ?? ""} className="input py-2">
            <option value="">All visitors</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From" className="sm:col-span-2">
          <input name="startsAt" type="date" defaultValue={a?.startsAt} className="input py-2" />
        </Field>
        <Field label="Until" className="sm:col-span-2">
          <input name="endsAt" type="date" defaultValue={a?.endsAt} className="input py-2" />
        </Field>
        <Field label="Order" className="sm:col-span-1">
          <input name="sortOrder" defaultValue={a?.sortOrder ?? 0} className="input py-2" />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={a?.isActive ?? true} className="size-4 accent-forest-800" /> Active
        </label>
        {a && (
          <label className="flex items-center gap-2 text-sm text-berry-600">
            <input type="checkbox" name="delete" className="size-4 accent-berry-600" /> Delete
          </label>
        )}
        <SubmitButton variant={a ? "ghost" : "primary"}>{a ? "Save" : "Add announcement"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Edits the homepage hero text and story. */
export function SiteContentForm({ s }: { s: SiteSettings }) {
  return (
    <ActionForm action={saveSiteContent} className="card space-y-4 p-5">
      <h2 className="font-semibold text-forest-900">Homepage & contact</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hero eyebrow">
          <input name="hero.eyebrow" defaultValue={s.hero.eyebrow} className="input" />
        </Field>
        <Field label="Headline line 1">
          <input name="hero.headline" defaultValue={s.hero.headline} className="input" required />
        </Field>
        <Field label="Headline line 2 (italic)">
          <input name="hero.headlineAccent" defaultValue={s.hero.headlineAccent} className="input" />
        </Field>
      </div>
      <Field label="Hero text">
        <textarea name="hero.subhead" defaultValue={s.hero.subhead} className="input min-h-20" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <input name="contact.phone" defaultValue={s.contact.phone} className="input" required />
        </Field>
        <Field label="Email">
          <input name="contact.email" defaultValue={s.contact.email} className="input" required />
        </Field>
        <Field label="Facebook URL">
          <input name="social.facebook" defaultValue={s.social.facebook} className="input" required />
        </Field>
        <Field label="Instagram URL">
          <input name="social.instagram" defaultValue={s.social.instagram} className="input" required />
        </Field>
      </div>
      <Field label="Story title">
        <input name="story.title" defaultValue={s.story.title} className="input" required />
      </Field>
      <Field label="Story paragraphs" hint="Separate paragraphs with a blank line.">
        <textarea name="story.paragraphs" defaultValue={s.story.paragraphs.join("\n\n")} className="input min-h-48" />
      </Field>
      <SubmitButton>Save content</SubmitButton>
    </ActionForm>
  );
}

/** Edits a content page in Markdown and publishes it. */
export function PageForm({ page }: { page: { slug: string; title: string; body: string; status: "draft" | "published" } }) {
  return (
    <ActionForm action={savePage} className="card space-y-3 p-5">
      <input type="hidden" name="slug" value={page.slug} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-forest-900">/policies/{page.slug}</p>
        <span className="text-xs text-forest-900/55">Formatting: ## heading, - list item, **bold**, [link](url)</span>
      </div>
      <Field label="Title">
        <input name="title" defaultValue={page.title} className="input py-2" required />
      </Field>
      <Field label="Body">
        <textarea name="body" defaultValue={page.body} className="input min-h-72 font-mono text-sm" required />
      </Field>
      <Toggle name="publish" defaultChecked={page.status === "published"} label="Published" hint="Unpublished pages show a “draft” notice and aren't indexed. Replace every “[To be confirmed by CHAJOY]” before publishing." />
      <SubmitButton>Save page</SubmitButton>
    </ActionForm>
  );
}
