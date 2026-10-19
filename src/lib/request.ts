import { cookies } from "next/headers";
import { createCart, findCart, setCartBranch, type Cart } from "@/lib/services/cart";
import { getBranchById } from "@/lib/services/branches";

export const CART_COOKIE = "cj_cart";
export const BRANCH_COOKIE = "cj_branch";

const cookieOpts = (maxAgeDays: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeDays * 86_400,
});

/** The branch the visitor is shopping from (drives prices & availability). */
export async function selectedBranchId(): Promise<number | null> {
  const v = (await cookies()).get(BRANCH_COOKIE)?.value;
  const id = v ? Number(v) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function selectedBranch() {
  return getBranchById(await selectedBranchId());
}

export async function setSelectedBranchCookie(branchId: number | null) {
  const jar = await cookies();
  if (branchId) jar.set(BRANCH_COOKIE, String(branchId), cookieOpts(180));
  else jar.delete(BRANCH_COOKIE);
}

export async function currentCart(): Promise<Cart | null> {
  return findCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Get the visitor's cart, creating one (and its cookie) on first use. */
export async function ensureCart(): Promise<Cart> {
  const existing = await currentCart();
  const branchId = await selectedBranchId();
  if (existing) {
    if (branchId && existing.branchId !== branchId && (await getBranchById(branchId))) return setCartBranch(existing, branchId);
    return existing;
  }
  const { cart, token } = await createCart({ branchId: (await getBranchById(branchId)) ? branchId : null });
  (await cookies()).set(CART_COOKIE, token, cookieOpts(60));
  return cart;
}
