/** Random tokens and hashing used for sessions, carts and order access links. */

import { createHash, randomBytes } from "node:crypto";

/** A URL-safe random token. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Hex SHA-256 hash; only hashes of tokens are stored in the database. */
export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** A random code in Crockford base32 (no ambiguous characters). */
export function randomCode(len: number): string {
  const b = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CROCKFORD[b[i] % 32];
  return out;
}

/** Compares two strings in constant time. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
