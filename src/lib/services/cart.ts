/**
 * Shopping cart service. Carts are identified by a random token in a cookie
 * (only its hash is stored). All prices are recomputed on the server.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import { normalizeOptions, optionsKey } from "@/lib/options";
import { MAX_LINE_QTY, quote, type Quote } from "@/lib/pricing";
import { catalogSnapshot } from "@/lib/services/catalog";
import { getBranchById, toBranchSnapshot, toPublicBranch, type PublicBranch } from "@/lib/services/branches";
import { activeDiscountCandidates } from "@/lib/services/promotions";
import { HttpError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/tokens";

export type Cart = typeof schema.carts.$inferSelect;

/** Finds the cart for a cookie token, or null. */
export async function findCart(token: string | undefined | null): Promise<Cart | null> {
  if (!token) return null;
  const [c] = await db.select().from(schema.carts).where(eq(schema.carts.tokenHash, sha256(token)));
  return c ?? null;
}

/** Creates a cart and returns it with the token to put in the cookie. */
export async function createCart(init: { branchId?: number | null; customerId?: number | null } = {}) {
  const token = randomToken();
  const [cart] = await db
    .insert(schema.carts)
    .values({ tokenHash: sha256(token), branchId: init.branchId ?? null, customerId: init.customerId ?? null })
    .returning();
  return { cart, token };
}

/** The lines in a cart, oldest first. */
export async function cartLines(cartId: string) {
  return db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cartId)).orderBy(schema.cartItems.id);
}

/**
 * Adds a product to the cart after validating its size and options.
 * Identical lines are merged by increasing the quantity.
 */
export async function addToCart(
  cart: Cart,
  input: { productId: number; variantId: number; quantity: number; options: unknown },
) {
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, input.productId),
    with: { variants: true },
  });
  if (!product || product.isAddon) throw new HttpError(404, "That item isn't on the menu.");
  if (product.status !== "active") throw new HttpError(409, `${product.name} is currently unavailable.`);
  const variant = product.variants.find((v) => v.id === input.variantId && v.isActive);
  if (!variant) throw new HttpError(409, "That size isn't available.");

  const addons = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.isAddon, true), eq(schema.products.status, "active")));
  const norm = normalizeOptions(product.optionConfig, input.options, new Set(addons.map((a) => a.id)));
  if (!norm.ok) throw new HttpError(422, norm.error);

  if (cart.branchId) {
    const [bp] = await db
      .select()
      .from(schema.branchProducts)
      .where(and(eq(schema.branchProducts.branchId, cart.branchId), eq(schema.branchProducts.productId, product.id)));
    if (!bp?.isAvailable) throw new HttpError(409, `${product.name} is currently unavailable at this branch.`);
  }

  const key = optionsKey(norm.options);
  const qty = Math.max(1, Math.min(MAX_LINE_QTY, Math.trunc(input.quantity)));
  const [existing] = await db
    .select()
    .from(schema.cartItems)
    .where(and(eq(schema.cartItems.cartId, cart.id), eq(schema.cartItems.variantId, variant.id), eq(schema.cartItems.optionsKey, key)));
  if (existing) {
    await db
      .update(schema.cartItems)
      .set({ quantity: Math.min(MAX_LINE_QTY, existing.quantity + qty), updatedAt: new Date() })
      .where(eq(schema.cartItems.id, existing.id));
  } else {
    await db.insert(schema.cartItems).values({
      cartId: cart.id,
      productId: product.id,
      variantId: variant.id,
      quantity: qty,
      options: norm.options,
      optionsKey: key,
    });
  }
  await touch(cart.id);
}

/** Changes a line's quantity; 0 removes it. */
export async function updateLine(cart: Cart, lineId: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_LINE_QTY)
    throw new HttpError(422, `Quantity must be between 0 and ${MAX_LINE_QTY}.`);
  if (quantity === 0) return removeLine(cart, lineId);
  await db
    .update(schema.cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(and(eq(schema.cartItems.id, lineId), eq(schema.cartItems.cartId, cart.id)));
  await touch(cart.id);
}

/** Removes a line from the cart. */
export async function removeLine(cart: Cart, lineId: number) {
  await db.delete(schema.cartItems).where(and(eq(schema.cartItems.id, lineId), eq(schema.cartItems.cartId, cart.id)));
  await touch(cart.id);
}

/** Sets the branch the cart will be ordered from. */
export async function setCartBranch(cart: Cart, branchId: number | null) {
  await db.update(schema.carts).set({ branchId, updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
  return { ...cart, branchId };
}

/** Sets pickup or delivery for the cart. */
export async function setCartFulfilment(cart: Cart, fulfilment: "pickup" | "delivery" | null) {
  await db.update(schema.carts).set({ fulfilment, updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
  return { ...cart, fulfilment };
}

/** Empties the cart, optionally inside a transaction. */
export async function clearCart(cartId: string, tx?: Tx) {
  await (tx ?? db).delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
}

async function touch(cartId: string) {
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
}

export type CartView = {
  branch: PublicBranch | null;
  fulfilment: "pickup" | "delivery" | null;
  itemCount: number;
  quote: Quote;
  images: Record<number, string | null>;
};

/** Prices the cart and returns everything the cart and checkout pages show. */
export async function buildCartView(
  cart: Cart | null,
  opts: { code?: string | null; deliveryDistanceKm?: number | null; fulfilment?: "pickup" | "delivery" | null; now?: Date } = {},
): Promise<CartView> {
  const now = opts.now ?? new Date();
  const lines = cart ? await cartLines(cart.id) : [];
  const branch = await getBranchById(cart?.branchId);
  const fulfilment = opts.fulfilment !== undefined ? opts.fulfilment : (cart?.fulfilment ?? null);
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const [catalog, discounts, imgs] = await Promise.all([
    catalogSnapshot(branch?.id ?? null, productIds),
    activeDiscountCandidates(now),
    productIds.length
      ? db
          .select({ productId: schema.productImages.productId, url: schema.productImages.url, variantKey: schema.productImages.variantKey })
          .from(schema.productImages)
          .where(inArray(schema.productImages.productId, productIds))
          .orderBy(schema.productImages.sortOrder)
      : Promise.resolve([]),
  ]);
  const q = quote({
    lines: lines.map((l) => ({ id: l.id, productId: l.productId, variantId: l.variantId, quantity: l.quantity, options: l.options })),
    catalog,
    branch: branch ? toBranchSnapshot(branch) : null,
    fulfilment,
    deliveryDistanceKm: opts.deliveryDistanceKm ?? null,
    discounts,
    code: opts.code ?? null,
    now,
  });
  const images: Record<number, string | null> = {};
  for (const id of productIds) images[id] = imgs.find((i) => i.productId === id && !i.variantKey)?.url ?? imgs.find((i) => i.productId === id)?.url ?? null;
  return {
    branch: branch ? toPublicBranch(branch, now) : null,
    fulfilment,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    quote: q,
    images,
  };
}
