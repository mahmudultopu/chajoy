// All money is integer paisa. 1 taka (৳) = 100 paisa.

export function takaToPaisa(taka: number): number {
  if (!Number.isFinite(taka)) throw new Error("Invalid amount");
  return Math.round(taka * 100);
}

/** Parse user input like "180", "180.5", "৳1,250.00" into paisa without float maths. */
export function parseTakaInput(input: string): number | null {
  const s = input.replace(/[৳,\s]/g, "").trim();
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return whole * 100 + frac;
}

export function formatBDT(paisa: number, opts: { symbol?: boolean } = {}): string {
  const negative = paisa < 0;
  const abs = Math.abs(Math.trunc(paisa));
  const taka = Math.floor(abs / 100);
  const rem = abs % 100;
  const whole = taka.toLocaleString("en-IN");
  const body = rem ? `${whole}.${String(rem).padStart(2, "0")}` : whole;
  return `${negative ? "−" : ""}${opts.symbol === false ? "" : "৳"}${body}`;
}

/** Plain decimal string for gateways and CSV ("180.00"). */
export function paisaToDecimalString(paisa: number): string {
  const abs = Math.abs(paisa);
  return `${paisa < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function percentOf(paisa: number, basisPoints: number): number {
  // floor so a discount never exceeds the advertised percentage
  return Math.floor((paisa * basisPoints) / 10_000);
}
