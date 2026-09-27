/**
 * Response schemas for the generated OpenAPI document — backend-architecture.md §22.
 *
 * Request bodies are generated from the live Zod schemas (see `openapi-adapter`),
 * so they cannot drift. Responses have no such source of truth in this codebase
 * — services return Prisma rows, not validated DTOs — so these are written by
 * hand to describe what the routes actually return, and `b10_hardening_check.js`
 * parses live payloads from a booted app against them, which turns "the docs are
 * probably right" into a check that fails when they are not.
 *
 * They are intentionally *minimum* shapes: `.passthrough()` on entities, so a
 * field the service adds later is documented as "at least these", not as a lie.
 * The fields listed are the ones a client is expected to rely on.
 */
import { z } from 'zod';

const money = z.union([z.number(), z.string()]);
const id = z.string();
const worldId = z.string();
const variantId = z.string();
const userId = z.string();
const orderId = z.string();
const timestamp = z.string();
const nullableId = z.string().nullable();

// ---------------------------------------------------------------- auth (§6)

export const sessionUserSchema = z
  .object({
    id,
    email: z.string().email(),
    displayName: z.string().nullable().optional(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'SHIPPING']),
    /** The same matrix the guards enforce, so the UI can gate without guessing. */
    permissions: z.array(z.string()),
  })
  .passthrough();

export const okSchema = z.object({ ok: z.literal(true) }).passthrough();

// ------------------------------------------------------------- worlds (§26)

/**
 * The identity fields, and only those. Timestamps are deliberately *not* here:
 * the public projection in `WorldsService.findBySlug` does not return them (a
 * storefront payload has no reason to expose when a World was created), and a
 * documented field the service never sends is a lie the client discovers later.
 */
export const worldIdentitySchema = z
  .object({
    id,
    slug: z.string(),
    name: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    locale: z.string(),
    direction: z.enum(['LTR', 'RTL']),
    themeTokens: z.record(z.string(), z.unknown()).nullable().optional(),
    capabilities: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

/** Super-Admin list: identity + how many sections it has, never the section configs. */
export const worldListItemSchema = worldIdentitySchema.extend({
  sectionCount: z.number().int().nonnegative(),
  createdAt: timestamp,
});

/** `position`, not `order` — the column, the service and the frontend all say position. */
export const worldSectionSchema = z
  .object({
    id,
    type: z.string(),
    position: z.number().int().nonnegative(),
    enabled: z.boolean(),
    config: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

/** Public storefront route: a World plus its ordered section composition. */
export const worldBySlugSchema = worldIdentitySchema.extend({
  sections: z.array(worldSectionSchema),
});

export const sectionListSchema = z.array(worldSectionSchema);

// ------------------------------------------------------- products (§5, §11)

export const categorySchema = z
  .object({ id, slug: z.string(), name: z.string() })
  .passthrough();

export const productVariantSchema = z
  .object({
    id,
    sku: z.string(),
    price: money,
    currency: z.string(),
    attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

export const productSchema = z
  .object({
    id,
    worldId,
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    category: categorySchema.nullable().optional(),
    variants: z.array(productVariantSchema),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .passthrough();

export const productListSchema = z.array(productSchema);

// ------------------------------------------------------------- cart (§6/§7)

export const cartItemSchema = z
  .object({
    id,
    variantId,
    quantity: z.number().int(),
    product: z
      .object({ id, name: z.string(), slug: z.string(), status: z.string(), worldId })
      .nullable()
      .optional(),
    variant: productVariantSchema
      .extend({
        inventory: z
          .object({
            id,
            quantity: z.number().int(),
            reserved: z.number().int(),
            available: z.number().int(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const cartSchema = z
  .object({
    id: nullableId,
    userId: nullableId,
    guestId: z.string().nullable().optional(),
    itemCount: z.number().int().nonnegative(),
    subtotal: z.number(),
    currency: z.string(),
    items: z.array(cartItemSchema),
  })
  .passthrough();

// ------------------------------------------------------------ orders (§7)

export const orderSchema = z
  .object({
    id,
    userId,
    status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED']),
    subtotal: money,
    tax: money,
    total: money,
    currency: z.string(),
    createdAt: timestamp,
    updatedAt: timestamp,
    items: z
      .array(
        z
          .object({
            id,
            variantId,
            quantity: z.number().int(),
            unitPrice: money.optional(),
            variant: productVariantSchema
              .extend({ product: productSchema.passthrough().optional() })
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
    payment: z.record(z.string(), z.unknown()).nullable().optional(),
    shipment: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

// --------------------------------------------------------- shipping (§8/§30)

/**
 * The shipping desk's projection — deliberately narrow (F10): label destination
 * only, never the customer record, never a product row, never money.
 */
export const shipmentLabelSchema = z
  .object({
    id,
    orderId,
    status: z.enum(['ORDERED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
    trackingNumber: z.string().nullable(),
    carrier: z.string().nullable(),
    updatedAt: timestamp,
    order: z.object({
      id,
      status: z.string(),
      placedAt: timestamp,
      itemCount: z.number().int().nonnegative(),
      recipientName: z.string().nullable(),
      recipientPhone: z.string().nullable(),
      shippingAddress: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  })
  .passthrough();

export const shipmentListSchema = z.array(shipmentLabelSchema);

// ------------------------------------------------------------- admin (§7)

export const adminDashboardSchema = z.record(z.string(), z.unknown());

export const userDirectoryItemSchema = z
  .object({
    id,
    email: z.string(),
    displayName: z.string().nullable().optional(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'SHIPPING']),
    createdAt: timestamp,
  })
  .passthrough();

export const auditLogEntrySchema = z
  .object({
    id,
    actorUserId: z.string().nullable().optional(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    createdAt: timestamp,
    actor: z
      .object({ id, email: z.string(), role: z.string() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const healthSchema = z.object({ status: z.string() });
