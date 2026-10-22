/**
 * Zod schemas for customer input: phone numbers, cart options, delivery
 * locations, checkout and passwords.
 */

import { z } from "zod";

/** Accepts 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX (with spaces/dashes) and returns +8801XXXXXXXXX. */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const m = /^(?:\+?88)?(01[3-9]\d{8})$/.exec(digits);
  return m ? `+88${m[1]}` : null;
}

/** A Bangladeshi mobile number, normalised to +8801XXXXXXXXX. */
export const bdPhone = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .transform((v, ctx) => {
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a Bangladeshi mobile number, e.g. 01712-345678." });
      return z.NEVER;
    }
    return n;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional();

/** Options a customer may send when adding to the cart. */
export const cartOptionsSchema = z
  .object({
    temperature: z.enum(["cold", "hot"]).optional(),
    flavour: z.enum(["original", "matcha"]).optional(),
    sugar: z.union([z.literal(50), z.literal(75), z.literal(100)]).optional(),
    ice: z.enum(["less", "normal"]).optional(),
    toppings: z.array(z.number().int().positive()).max(10).optional(),
  })
  .strict();

/** Body of an add-to-cart request. */
export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20).default(1),
  options: cartOptionsSchema.default({}),
});

/** Delivery address and optional map pin. */
export const deliveryLocationSchema = z.object({
  addressLine: z.string().trim().min(6, "Enter your full address (house, road, area).").max(300),
  area: optionalText(100),
  city: z.string().trim().min(2).max(60).default("Dhaka"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Body of a checkout request. */
export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    branchId: z.number().int().positive(),
    fulfilment: z.enum(["pickup", "delivery"]),
    name: z.string().trim().min(2, "Enter your name.").max(80),
    phone: bdPhone,
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v.toLowerCase() : undefined))
      .pipe(z.string().email("Enter a valid email or leave it blank.").optional()),
    delivery: deliveryLocationSchema.optional(),
    deliveryInstructions: optionalText(300),
    notes: optionalText(300),
    paymentMethod: z.enum(["cod", "sslcommerz"]),
    discountCode: optionalText(40),
    saveAddress: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "delivery" && !v.delivery)
      ctx.addIssue({ code: "custom", path: ["delivery"], message: "Add your delivery address and location." });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Password rules for customer accounts. */
export const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(200);

/** URLs that end up in an href or src must be https (z.url() alone accepts javascript:). */
export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a full https:// link");
