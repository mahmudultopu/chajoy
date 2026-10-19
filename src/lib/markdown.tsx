import Link from "next/link";
import { Fragment } from "react";

// Tiny, safe markdown for admin-edited pages: ## headings, paragraphs,
// "- " lists, **bold**, *italic* and [links](url). No raw HTML is rendered.

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t)!;
      const safe = /^(https?:|mailto:|tel:|\/)/.test(href) ? href : "#";
      out.push(
        safe.startsWith("/") ? (
          <Link key={`${key}-${i++}`} href={safe} className="font-semibold underline">
            {label}
          </Link>
        ) : (
          <a key={`${key}-${i++}`} href={safe} className="font-semibold underline" rel="noopener noreferrer">
            {label}
          </a>
        ),
      );
    } else out.push(<em key={`${key}-${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-base leading-relaxed text-forest-900/80">
      {blocks.map((b, bi) => {
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("## ")) return <h2 key={bi} className="pt-4 font-display text-2xl font-semibold text-forest-900">{inline(t.slice(3), `h${bi}`)}</h2>;
        if (t.startsWith("### ")) return <h3 key={bi} className="pt-2 text-lg font-semibold text-forest-900">{inline(t.slice(4), `h${bi}`)}</h3>;
        const lines = t.split("\n");
        if (lines.every((l) => /^[-*] /.test(l)))
          return (
            <ul key={bi} className="list-disc space-y-1 pl-6">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.slice(2), `l${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `p${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
