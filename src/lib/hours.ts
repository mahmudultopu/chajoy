/**
 * Branch opening hours: parsing, formatting and open/closed status, always
 * evaluated in Dhaka time.
 */

import type { OpeningHours } from "@/lib/db/schema";

// Bangladesh Standard Time is UTC+6 all year (no daylight saving).
const DHAKA_OFFSET_MIN = 6 * 60;
/** Day keys used in opening-hours data, Sunday first. */
export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];
/** Display names for each day. */
export const DAY_LABELS: Record<Day, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/** The current day and minute of the day in Dhaka. */
export function dhakaClock(now: Date): { day: Day; dayIndex: number; minutes: number } {
  const t = new Date(now.getTime() + DHAKA_OFFSET_MIN * 60_000);
  const dayIndex = t.getUTCDay();
  return { day: DAYS[dayIndex], dayIndex, minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** Parses "HH:MM" into minutes since midnight, or null. */
export function parseHHMM(s: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Formats minutes since midnight as a 12-hour time, e.g. "11:30 pm". */
export function formatHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm ? `${h12}:${String(mm).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Validates an hours object; intervals may cross midnight (e.g. 18:00–02:00). */
export function validateHours(hours: unknown): hours is OpeningHours {
  if (!hours || typeof hours !== "object") return false;
  for (const [k, v] of Object.entries(hours as Record<string, unknown>)) {
    if (!DAYS.includes(k as Day)) return false;
    if (!Array.isArray(v)) return false;
    for (const iv of v) {
      if (!Array.isArray(iv) || iv.length !== 2) return false;
      const a = parseHHMM(String(iv[0]));
      const b = parseHHMM(String(iv[1]));
      if (a === null || b === null || a === b) return false;
    }
  }
  return true;
}

/** True when at least one day has opening hours. */
export function hasAnyHours(hours: OpeningHours | null | undefined): boolean {
  return !!hours && Object.values(hours).some((v) => v && v.length > 0);
}

export type OpenStatus =
  | { state: "unknown" }
  | { state: "open"; closesAt: string }
  | { state: "closed"; opensAt: string | null; opensDay: Day | null };

/** Works out whether a branch is open now, and when it next closes or opens. */
export function getOpenStatus(hours: OpeningHours | null | undefined, now = new Date()): OpenStatus {
  if (!hasAnyHours(hours)) return { state: "unknown" };
  const h = hours!;
  const { dayIndex, minutes } = dhakaClock(now);

  // Interval on day d covering minute m of day d (m may be +1440 for "after midnight").
  const intervals = (d: number) =>
    (h[DAYS[(d + 7) % 7]] ?? []).map(([a, b]) => {
      const s = parseHHMM(a)!;
      let e = parseHHMM(b)!;
      if (e <= s) e += 1440;
      return [s, e] as const;
    });

  for (const [s, e] of intervals(dayIndex)) {
    if (minutes >= s && minutes < e) return { state: "open", closesAt: formatHHMM(e) };
  }
  for (const [s, e] of intervals(dayIndex - 1)) {
    if (minutes + 1440 >= s && minutes + 1440 < e) return { state: "open", closesAt: formatHHMM(e) };
  }
  // next opening within a week
  for (let i = 0; i < 7; i++) {
    const starts = intervals(dayIndex + i)
      .map(([s]) => s)
      .filter((s) => i > 0 || s > minutes)
      .sort((a, b) => a - b);
    if (starts.length) return { state: "closed", opensAt: formatHHMM(starts[0]), opensDay: i === 0 ? null : DAYS[(dayIndex + i) % 7] };
  }
  return { state: "closed", opensAt: null, opensDay: null };
}

/** Turns an open status into a short label for the storefront. */
export function describeOpenStatus(st: OpenStatus): string {
  if (st.state === "unknown") return "Opening hours not published yet";
  if (st.state === "open") return `Open now · until ${st.closesAt}`;
  if (!st.opensAt) return "Closed";
  return st.opensDay ? `Closed · opens ${DAY_LABELS[st.opensDay]} ${st.opensAt}` : `Closed · opens ${st.opensAt}`;
}
