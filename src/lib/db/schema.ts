import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Money is stored as integer paisa (1 taka = 100 paisa). Never floats.

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export type Verification = {
  status: "verified" | "needs_verification";
  source?: string;
  notes?: string;
};

export type ProductOptionConfig = {
  temperatures?: ("cold" | "hot")[];
  flavours?: ("original" | "matcha")[];
  sugar?: boolean;
  ice?: boolean;
  toppings?: boolean;
};

export type ProductVisual = {
  vessel: "cup" | "cone" | "sundae";
  liquid?: string;
  liquid2?: string;
  stripes?: string;
  pearls?: boolean;
  jelly?: boolean;
  ice?: boolean;
  clear?: boolean;
  topping?: "fruit" | "crumbs" | "cream";
  fruit?: "lemon" | "lime" | "strawberry" | "peach" | "blueberry" | "guava" | "oreo" | "coconut";
  serve?: "original" | "matcha" | "twist";
  sauce?: string;
};

export type Model3d =
  | { kind: "procedural"; visual: ProductVisual }
  | { kind: "glb"; url: string; official: boolean };

export type OpeningHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string][]>>;

export type CartLineOptions = {
  temperature?: "cold" | "hot";
  flavour?: "original" | "matcha";
  sugar?: 50 | 75 | 100;
  ice?: "less" | "normal";
  toppings?: number[]; // product ids of add-ons
};

// ---------------------------------------------------------------- catalogue

export const productCategories = pgTable("product_categories", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  menuName: text(),
  description: text(),
  accent: text(),
  sortOrder: integer().notNull().default(0),
  isAddonCategory: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: serial().primaryKey(),
    slug: text().notNull().unique(),
    sku: text().unique(),
    name: text().notNull(),
    nameZh: text(),
    categoryId: integer()
      .notNull()
      .references(() => productCategories.id),
    subcategory: text(),
    description: text(),
    status: text({ enum: ["active", "inactive", "unavailable"] }).notNull().default("active"),
    isAddon: boolean().notNull().default(false),
    isFeatured: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    optionConfig: jsonb().$type<ProductOptionConfig>().notNull().default({}),
    ingredients: text(),
    ingredientsVerified: boolean().notNull().default(false),
    allergens: text(),
    allergensVerified: boolean().notNull().default(false),
    preparationNotes: text(),
    model3d: jsonb().$type<Model3d>(),
    verification: jsonb().$type<Verification>().notNull().default({ status: "needs_verification" }),
    ...timestamps,
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_status_idx").on(t.status)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial().primaryKey(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text().notNull(),
    alt: text().notNull(),
    sortOrder: integer().notNull().default(0),
    // e.g. "flavour:matcha" — lets the product page swap the photo for an option
    variantKey: text(),
    sourceType: text({ enum: ["official_menu", "official_photo", "upload", "placeholder"] }).notNull(),
    sourceUrl: text(),
    sourceNote: text(),
    usageRights: text(),
    width: integer(),
    height: integer(),
    isLowRes: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial().primaryKey(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sizeCode: text().notNull(), // S | M | L | ONE
    label: text().notNull(),
    volumeMl: integer(),
    pricePaisa: integer().notNull(),
    sku: text().unique(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("product_variants_product_size_uq").on(t.productId, t.sizeCode)],
);

// ---------------------------------------------------------------- branches

export const branches = pgTable("branches", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  area: text().notNull(),
  addressLine: text(),
  city: text().notNull().default("Dhaka"),
  addressVerified: boolean().notNull().default(false),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  locationPrecision: text({ enum: ["exact", "approximate", "unknown"] }).notNull().default("unknown"),
  locationSource: text(),
  phone: text(),
  openingHours: jsonb().$type<OpeningHours>(),
  temporarilyClosed: boolean().notNull().default(false),
  closureNote: text(),
  isActive: boolean().notNull().default(true),
  acceptsOnlineOrders: boolean().notNull().default(false),
  pickupEnabled: boolean().notNull().default(false),
  deliveryEnabled: boolean().notNull().default(false),
  deliveryFeePaisa: integer(),
  deliveryRadiusKm: doublePrecision(),
  deliveryAreas: jsonb().$type<string[]>(),
  minOrderPaisa: integer(),
  prepTimeMinutes: integer(),
  deliveryTimeMinutes: integer(),
  photoUrl: text(),
  // true when operational values were filled by `npm run db:demo-ops`
  isSampleConfig: boolean().notNull().default(false),
  verification: jsonb().$type<Verification>().notNull().default({ status: "needs_verification" }),
  ...timestamps,
});

export const branchProducts = pgTable(
  "branch_products",
  {
    id: serial().primaryKey(),
    branchId: integer()
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    isAvailable: boolean().notNull().default(true),
    note: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex("branch_products_uq").on(t.branchId, t.productId)],
);

export const branchInventory = pgTable(
  "branch_inventory",
  {
    id: serial().primaryKey(),
    branchId: integer()
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    variantId: integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    pricePaisa: integer(), // null = use the variant's menu price
    trackStock: boolean().notNull().default(false),
    stockQty: integer(),
    lowStockThreshold: integer().notNull().default(5),
    ...timestamps,
  },
  (t) => [uniqueIndex("branch_inventory_uq").on(t.branchId, t.variantId)],
);

// ---------------------------------------------------------------- customers

export const customers = pgTable("customers", {
  id: serial().primaryKey(),
  email: text().unique(),
  phone: text(),
  name: text().notNull(),
  passwordHash: text(),
  marketingConsent: boolean().notNull().default(false),
  ...timestamps,
});

export const customerSessions = pgTable("customer_sessions", {
  id: text().primaryKey(), // sha256 of the cookie token
  customerId: integer()
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: serial().primaryKey(),
  customerId: integer()
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  label: text().notNull(),
  recipientName: text().notNull(),
  phone: text().notNull(),
  addressLine: text().notNull(),
  area: text(),
  city: text().notNull().default("Dhaka"),
  notes: text(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  ...timestamps,
});

// ---------------------------------------------------------------- carts

export const carts = pgTable("carts", {
  id: uuid().primaryKey().defaultRandom(),
  tokenHash: text().notNull().unique(),
  customerId: integer().references(() => customers.id, { onDelete: "set null" }),
  branchId: integer().references(() => branches.id, { onDelete: "set null" }),
  fulfilment: text({ enum: ["pickup", "delivery"] }),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial().primaryKey(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: integer()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    options: jsonb().$type<CartLineOptions>().notNull().default({}),
    optionsKey: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [uniqueIndex("cart_items_line_uq").on(t.cartId, t.variantId, t.optionsKey)],
);

// ---------------------------------------------------------------- orders

export const ORDER_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type DeliveryAddress = {
  addressLine: string;
  area?: string;
  city: string;
  latitude: number;
  longitude: number;
};

export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey(),
    orderNumber: text().notNull().unique(),
    accessTokenHash: text().notNull(),
    idempotencyKey: text().notNull().unique(),
    // the browser cart it came from: lets that browser reopen the order even if
    // the response carrying the access link was lost
    cartId: uuid(),
    customerId: integer().references(() => customers.id, { onDelete: "set null" }),
    branchId: integer()
      .notNull()
      .references(() => branches.id),
    status: text({ enum: ORDER_STATUSES }).notNull().default("pending_confirmation"),
    fulfilmentMethod: text({ enum: ["pickup", "delivery"] }).notNull(),
    customerName: text().notNull(),
    customerPhone: text().notNull(),
    customerEmail: text(),
    deliveryAddress: jsonb().$type<DeliveryAddress>(),
    deliveryDistanceKm: doublePrecision(), // straight-line, branch pin to delivery pin
    deliveryInstructions: text(),
    notes: text(),
    subtotalPaisa: integer().notNull(),
    discountPaisa: integer().notNull().default(0),
    deliveryFeePaisa: integer().notNull().default(0),
    taxPaisa: integer().notNull().default(0),
    totalPaisa: integer().notNull(),
    promotionId: integer().references(() => promotions.id, { onDelete: "set null" }),
    discountCode: text(),
    paymentMethod: text({ enum: ["cod", "sslcommerz"] }).notNull(),
    paymentStatus: text({ enum: PAYMENT_STATUSES }).notNull().default("pending"),
    isSampleConfig: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("orders_branch_idx").on(t.branchId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_phone_idx").on(t.customerPhone),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer().references(() => products.id, { onDelete: "set null" }),
    variantId: integer().references(() => productVariants.id, { onDelete: "set null" }),
    // snapshot at the time of the order
    productName: text().notNull(),
    variantLabel: text().notNull(),
    sizeCode: text().notNull(),
    options: jsonb().$type<CartLineOptions>().notNull().default({}),
    optionsLabel: text().notNull().default(""),
    basePricePaisa: integer().notNull(),
    toppingsPricePaisa: integer().notNull().default(0),
    unitPricePaisa: integer().notNull(),
    quantity: integer().notNull(),
    lineTotalPaisa: integer().notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial().primaryKey(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text().notNull(),
    note: text(),
    actor: text().notNull(), // "customer", "system", "admin:<id>"
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial().primaryKey(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text({ enum: ["cod", "sslcommerz"] }).notNull(),
    amountPaisa: integer().notNull(),
    status: text({ enum: ["initiated", "pending", "paid", "failed", "cancelled", "refunded"] }).notNull(),
    transactionRef: text(), // our tran_id sent to the gateway
    providerRef: text(), // gateway's val_id / bank_tran_id
    meta: jsonb().$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payments_provider_tran_uq").on(t.provider, t.transactionRef),
    index("payments_order_idx").on(t.orderId),
  ],
);

export const deliveries = pgTable("deliveries", {
  id: serial().primaryKey(),
  orderId: integer()
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text({ enum: ["in_house", "provider", "manual"] }).notNull().default("manual"),
  providerName: text(),
  riderName: text(),
  riderPhone: text(),
  trackingRef: text(),
  trackingUrl: text(),
  status: text({ enum: ["pending", "assigned", "picked_up", "delivered", "failed", "cancelled"] })
    .notNull()
    .default("pending"),
  feePaisa: integer().notNull().default(0),
  assignedAt: timestamp({ withTimezone: true }),
  pickedUpAt: timestamp({ withTimezone: true }),
  deliveredAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

// ---------------------------------------------------------------- promotions & content

export const promotions = pgTable("promotions", {
  id: serial().primaryKey(),
  title: text().notNull(),
  description: text(),
  terms: text().notNull(),
  bannerImageUrl: text(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  isActive: boolean().notNull().default(false),
  ...timestamps,
});

export const discountRules = pgTable("discount_rules", {
  id: serial().primaryKey(),
  promotionId: integer()
    .notNull()
    .references(() => promotions.id, { onDelete: "cascade" }),
  code: text(), // null = applied automatically when eligible
  kind: text({ enum: ["percent", "fixed"] }).notNull(),
  // percent: basis points (1000 = 10%); fixed: paisa
  value: integer().notNull(),
  minSubtotalPaisa: integer().notNull().default(0),
  maxDiscountPaisa: integer(),
  branchIds: jsonb().$type<number[]>(), // null = every branch
  fulfilment: text({ enum: ["any", "pickup", "delivery"] }).notNull().default("any"),
  usageLimit: integer(),
  usedCount: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  ...timestamps,
}, (t) => [uniqueIndex("discount_rules_code_uq").on(sql`lower(${t.code})`)]);

export const announcements = pgTable("announcements", {
  id: serial().primaryKey(),
  message: text().notNull(),
  linkUrl: text(),
  linkLabel: text(),
  branchId: integer().references(() => branches.id, { onDelete: "cascade" }),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const contentPages = pgTable("content_pages", {
  slug: text().primaryKey(),
  title: text().notNull(),
  body: text().notNull(),
  status: text({ enum: ["draft", "published"] }).notNull().default("draft"),
  ...timestamps,
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  consentText: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------- admin

export const ADMIN_ROLES = ["owner", "manager", "branch_staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const adminUsers = pgTable("admin_users", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  name: text().notNull(),
  passwordHash: text().notNull(),
  role: text({ enum: ADMIN_ROLES }).notNull(),
  branchId: integer().references(() => branches.id, { onDelete: "set null" }),
  isActive: boolean().notNull().default(true),
  lastLoginAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

export const adminSessions = pgTable("admin_sessions", {
  id: text().primaryKey(), // sha256 of the cookie token
  adminUserId: integer()
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ip: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial().primaryKey(),
    actorType: text({ enum: ["admin", "system", "customer"] }).notNull(),
    actorId: integer(),
    actorLabel: text(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    summary: text().notNull(),
    diff: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------- relations

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  branchProducts: many(branchProducts),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventory: many(branchInventory),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  branchProducts: many(branchProducts),
  inventory: many(branchInventory),
  orders: many(orders),
}));

export const branchProductsRelations = relations(branchProducts, ({ one }) => ({
  branch: one(branches, { fields: [branchProducts.branchId], references: [branches.id] }),
  product: one(products, { fields: [branchProducts.productId], references: [products.id] }),
}));

export const branchInventoryRelations = relations(branchInventory, ({ one }) => ({
  branch: one(branches, { fields: [branchInventory.branchId], references: [branches.id] }),
  variant: one(productVariants, { fields: [branchInventory.variantId], references: [productVariants.id] }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  branch: one(branches, { fields: [carts.branchId], references: [branches.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  branch: one(branches, { fields: [orders.branchId], references: [branches.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  history: many(orderStatusHistory),
  payments: many(payments),
  delivery: one(deliveries, { fields: [orders.id], references: [deliveries.orderId] }),
  promotion: one(promotions, { fields: [orders.promotionId], references: [promotions.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, { fields: [deliveries.orderId], references: [orders.id] }),
}));

export const promotionsRelations = relations(promotions, ({ many }) => ({
  rules: many(discountRules),
}));

export const discountRulesRelations = relations(discountRules, ({ one }) => ({
  promotion: one(promotions, { fields: [discountRules.promotionId], references: [promotions.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(customerAddresses),
  orders: many(orders),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, { fields: [customerAddresses.customerId], references: [customers.id] }),
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  branch: one(branches, { fields: [adminUsers.branchId], references: [branches.id] }),
}));
