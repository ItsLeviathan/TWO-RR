import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"] as const;
export const ORDER_TYPES = ["dine_in", "takeout", "pickup"] as const;
export const PAYMENT_METHODS = ["cash", "gcash", "card"] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid", "voided"] as const;
export const ORDER_SOURCES = ["online", "pos"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const orderTypeEnum = pgEnum("order_type", ORDER_TYPES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const orderSourceEnum = pgEnum("order_source", ORDER_SOURCES);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export const USER_ROLES = ["owner", "staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** owner = full access; staff = cashier (POS, recent orders, payments, receipts). */
    role: userRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    /** Bumped on disable / role change / password reset — invalidates every existing session. */
    sessionVersion: integer("session_version").notNull().default(1),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("users_session_version_positive", sql`${t.sessionVersion} > 0`)],
);

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    /** Base price in centavos (₱1.00 = 100). */
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url"),
    sku: text("sku").unique(),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    trackInventory: boolean("track_inventory").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_price_nonnegative", sql`${t.priceCents} >= 0`),
    index("products_category_idx").on(t.categoryId),
  ],
);

/** A choice within a named group, e.g. group "Size" → "Regular" / "Large". Exactly one per group is selected. */
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    groupName: text("group_name").notNull().default("Size"),
    name: text("name").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    check("product_options_delta_nonnegative", sql`${t.priceDeltaCents} >= 0`),
    index("product_options_product_idx").on(t.productId),
  ],
);

/** Optional extras, any number may be selected, e.g. "Extra Shot +₱30". */
export const productAddons = pgTable(
  "product_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    check("product_addons_price_nonnegative", sql`${t.priceCents} >= 0`),
    index("product_addons_product_idx").on(t.productId),
  ],
);

/** Present only for products with inventory tracking enabled. */
export const inventory = pgTable(
  "inventory",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("inventory_quantity_nonnegative", sql`${t.quantity} >= 0`),
    check("inventory_threshold_nonnegative", sql`${t.lowStockThreshold} >= 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-friendly sequential number shown to customers and on receipts. */
    orderNumber: integer("order_number").notNull().unique().generatedAlwaysAsIdentity({ startWith: 1001 }),
    /** Client-generated key that makes order submission idempotent (prevents duplicates on double-submit / retries). */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    source: orderSourceEnum("source").notNull(),
    customerName: text("customer_name"),
    orderType: orderTypeEnum("order_type").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** True while stock for this order is deducted; flipped back when a cancellation restores it. */
    inventoryDeducted: boolean("inventory_deducted").notNull().default(false),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check("orders_total_positive", sql`${t.totalCents} > 0`),
    check("orders_subtotal_positive", sql`${t.subtotalCents} > 0`),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_status_idx").on(t.status),
  ],
);

export type OrderItemSelections = {
  options: { group: string; name: string; priceDeltaCents: number }[];
  addons: { name: string; priceCents: number }[];
};

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Nullable so historical orders survive product deletion; name/price are snapshotted below. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    categoryName: text("category_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    selections: jsonb("selections").$type<OrderItemSelections>().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_nonnegative", sql`${t.unitPriceCents} >= 0`),
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("unpaid"),
    amountCents: integer("amount_cents").notNull(),
    /** Cash handed over by the customer (cash payments only). */
    tenderedCents: integer("tendered_cents"),
    changeCents: integer("change_cents"),
    /** GCash/card reference number entered by staff, if any. */
    reference: text("reference"),
    recordedById: uuid("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("payments_amount_positive", sql`${t.amountCents} > 0`),
    check("payments_change_nonnegative", sql`${t.changeCents} IS NULL OR ${t.changeCents} >= 0`),
    check(
      "payments_tendered_covers_amount",
      sql`${t.tenderedCents} IS NULL OR ${t.tenderedCents} >= ${t.amountCents}`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Business settings (single row, id = 1)                              */
/* ------------------------------------------------------------------ */

export const businessSettings = pgTable(
  "business_settings",
  {
    id: integer("id").primaryKey().default(1),
    businessName: text("business_name").notNull().default("TWO RR"),
    tagline: text("tagline").notNull().default("Good Coffee. Great Moments."),
    /** Null → use the bundled TWO RR logo. */
    logoUrl: text("logo_url"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    openingHours: text("opening_hours"),
    mapUrl: text("map_url"),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),
    tiktokUrl: text("tiktok_url"),
    aboutHeadline: text("about_headline"),
    aboutStory: text("about_story"),
    aboutMission: text("about_mission"),
    receiptHeader: text("receipt_header"),
    receiptFooter: text("receipt_footer").notNull().default("Thank you for visiting TWO RR!"),
    receiptShowAddress: boolean("receipt_show_address").notNull().default(true),
    receiptShowPhone: boolean("receipt_show_phone").notNull().default(true),
    receiptWidthMm: integer("receipt_width_mm").notNull().default(80),
    currency: text("currency").notNull().default("PHP"),
    paymentMethods: paymentMethodEnum("payment_methods").array().notNull().default(sql`ARRAY['cash','gcash','card']::payment_method[]`),
    orderTypes: orderTypeEnum("order_types").array().notNull().default(sql`ARRAY['dine_in','takeout','pickup']::order_type[]`),
    onlineOrderingEnabled: boolean("online_ordering_enabled").notNull().default(true),
    posDefaultStatus: orderStatusEnum("pos_default_status").notNull().default("completed"),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("business_settings_singleton", sql`${t.id} = 1`),
    check("business_settings_receipt_width", sql`${t.receiptWidthMm} IN (58, 80)`),
  ],
);

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

export const GALLERY_CATEGORIES = ["coffee", "food", "interior", "exterior", "staff", "atmosphere"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  caption: text("caption"),
  category: text("category", { enum: GALLERY_CATEGORIES }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  options: many(productOptions),
  addons: many(productAddons),
  inventory: one(inventory, { fields: [products.id], references: [inventory.productId] }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, { fields: [productOptions.productId], references: [products.id] }),
}));

export const productAddonsRelations = relations(productAddons, ({ one }) => ({
  product: one(products, { fields: [productAddons.productId], references: [products.id] }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payment: one(payments, { fields: [orders.id], references: [payments.orderId] }),
  createdBy: one(users, { fields: [orders.createdById], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  recordedBy: one(users, { fields: [payments.recordedById], references: [users.id] }),
}));
