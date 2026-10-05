import { z } from "zod";
import { ORDER_STATUSES, ORDER_TYPES, PAYMENT_METHODS, GALLERY_CATEGORIES, USER_ROLES } from "@/db/schema";
import { MAX_PRICE_CENTS } from "./money";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "./pricing";
import { isSafeImageUrl } from "./utils";

const id = z.uuid("Invalid reference.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const cents = z
  .number({ error: "Enter a valid amount." })
  .int("Enter a valid amount.")
  .min(0, "Amounts cannot be negative.")
  .max(MAX_PRICE_CENTS, "That amount is too large.");

export const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || isSafeImageUrl(v), "Image must be an https:// link or an uploaded image.")
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    if (v === "") return true;
    try {
      return ["https:", "http:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, "Enter a full link starting with https://")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const orderLineSchema = z.object({
  productId: id,
  optionIds: z.array(id).max(20),
  addonIds: z.array(id).max(30),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(MAX_LINE_QUANTITY),
});

export const orderLinesSchema = z
  .array(orderLineSchema)
  .min(1, "Your order is empty.")
  .max(MAX_ORDER_LINES, "This order has too many items.");

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(100),
  items: orderLinesSchema,
  customerName: z.string().trim().min(1, "Please enter your name.").max(80),
  orderType: z.enum(ORDER_TYPES, "Choose how you'd like your order."),
  paymentMethod: z.enum(PAYMENT_METHODS, "Choose a payment method."),
  notes: optionalText(300),
  expectedTotalCents: z.number().int().positive(),
});

export const posSaleSchema = z.object({
  idempotencyKey: z.string().min(16).max(100),
  items: orderLinesSchema,
  customerName: optionalText(80),
  orderType: z.enum(ORDER_TYPES),
  notes: optionalText(300),
  paymentMethod: z.enum(PAYMENT_METHODS),
  tenderedCents: cents.nullable(),
  reference: optionalText(80),
  expectedTotalCents: z.number().int().positive(),
});

export const recordPaymentSchema = z.object({
  orderId: id,
  method: z.enum(PAYMENT_METHODS),
  tenderedCents: cents.nullable(),
  reference: optionalText(80),
});

export const orderStatusSchema = z.object({ orderId: id, status: z.enum(ORDER_STATUSES) });

export const productSchema = z.object({
  id: id.nullable(),
  name: z.string().trim().min(1, "Name is required.").max(100),
  description: z.string().trim().max(600).default(""),
  categoryId: id,
  priceCents: cents,
  imageUrl,
  sku: optionalText(40),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  trackInventory: z.boolean(),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative.").max(1_000_000).nullable(),
  lowStockThreshold: z.number().int().min(0).max(100_000),
  options: z
    .array(
      z.object({
        id: id.nullable(),
        groupName: z.string().trim().min(1, "Option group name is required.").max(40),
        name: z.string().trim().min(1, "Option name is required.").max(60),
        priceDeltaCents: cents,
      }),
    )
    .max(20),
  addons: z
    .array(
      z.object({
        id: id.nullable(),
        name: z.string().trim().min(1, "Add-on name is required.").max(60),
        priceCents: cents,
        isAvailable: z.boolean(),
      }),
    )
    .max(30),
});
export type ProductInput = z.input<typeof productSchema>;

export const categoryNameSchema = z.string().trim().min(1, "Category name is required.").max(50);

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required.").max(80),
  tagline: z.string().trim().max(120),
  logoUrl: imageUrl,
  address: optionalText(300),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email.")
    .transform((v) => (v === "" ? null : v)),
  openingHours: optionalText(400),
  mapUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  aboutHeadline: optionalText(140),
  aboutStory: optionalText(3000),
  aboutMission: optionalText(1000),
  receiptHeader: optionalText(200),
  receiptFooter: z.string().trim().max(200),
  receiptShowAddress: z.boolean(),
  receiptShowPhone: z.boolean(),
  receiptWidthMm: z.union([z.literal(58), z.literal(80)]),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1, "Enable at least one payment method."),
  orderTypes: z.array(z.enum(ORDER_TYPES)).min(1, "Enable at least one order type."),
  onlineOrderingEnabled: z.boolean(),
  posDefaultStatus: z.enum(["completed", "preparing", "pending"]),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(10, "Use at least 10 characters.").max(200),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export const galleryImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Add an image.")
    .refine(isSafeImageUrl, "Image must be an https:// link or an uploaded image."),
  alt: z.string().trim().min(1, "Describe the photo for screen readers.").max(160),
  caption: optionalText(160),
  category: z.enum(GALLERY_CATEGORIES),
});

const newPassword = z.string().min(10, "Use at least 10 characters.").max(200);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.email("Enter a valid email.").trim().toLowerCase().max(120),
  role: z.enum(USER_ROLES),
  password: newPassword,
});

export const userUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.email("Enter a valid email.").trim().toLowerCase().max(120),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
});

export const passwordResetSchema = z.object({ id: z.uuid(), password: newPassword });
