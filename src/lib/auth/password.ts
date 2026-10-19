import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const COST = 12;

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, COST);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Compared against when the email doesn't exist, so response time doesn't
// reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(pw: string): Promise<false> {
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), COST);
  await bcrypt.compare(pw, await dummyHash);
  return false;
}
