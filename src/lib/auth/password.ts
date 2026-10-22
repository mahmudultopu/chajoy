/** Password hashing with bcrypt. */

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const COST = 12;

/** Hashes a password for storage. */
export function hashPassword(pw: string) {
  return bcrypt.hash(pw, COST);
}

/** Checks a password against a stored hash. */
export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Compared against when the email doesn't exist, so response time doesn't
// reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
/** Spends the same time as a real check when the account doesn't exist, then fails. */
export async function verifyAgainstDummy(pw: string): Promise<false> {
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), COST);
  await bcrypt.compare(pw, await dummyHash);
  return false;
}
