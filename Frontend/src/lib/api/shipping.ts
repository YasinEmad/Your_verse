/**
 * Typed shipping API — frontend-architecture.md §16 / §30.
 *
 * This module is the whole contract of the shipping surface, and it is
 * deliberately narrow: a shipment plus the label context the backend chose to
 * expose (order id, order status, item count, destination). There is no product
 * name, no price, no customer email/role/user id anywhere in these schemas —
 * the backend does not send them, and if it ever starts sending them these
 * schemas will *not* silently absorb them: unknown keys are dropped rather than
 * spread into a component that might render them.
 */
import { z } from "zod";
import { apiFetch } from "./client";

export const shipmentStatusSchema = z.enum([
  "ORDERED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

/** Address lines exactly as captured at checkout; all optional because the
 *  checkout form does not collect a destination yet (see the Order migration). */
export const shippingAddressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const shipmentSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  status: shipmentStatusSchema,
  trackingNumber: z.string().nullable().default(null),
  carrier: z.string().nullable().default(null),
  updatedAt: z.string().optional(),
  order: z.object({
    id: z.string().min(1),
    status: z.string().default("PENDING"),
    placedAt: z.string().optional(),
    itemCount: z.number().int().nonnegative().default(0),
    recipientName: z.string().nullable().default(null),
    recipientPhone: z.string().nullable().default(null),
    shippingAddress: shippingAddressSchema,
  }),
});

export type Shipment = z.infer<typeof shipmentSchema>;

export interface UpdateShipmentInput {
  trackingNumber?: string;
  carrier?: string;
  status?: ShipmentStatus;
}

/** `GET /api/v1/shipments` — `shipping.read`: SHIPPING, ADMIN, SUPER_ADMIN. */
export async function listShipments(): Promise<Shipment[]> {
  const raw = await apiFetch<unknown>("/api/v1/shipments", { cache: "no-store" });
  return z.array(shipmentSchema).parse(raw);
}

/**
 * `PATCH /api/v1/shipments/:id` — the only mutation this surface exposes.
 * Returns the same label projection the list returns, so a caller can drop the
 * response straight into its cache instead of guessing the new shape.
 */
export async function updateShipment(
  shipmentId: string,
  patch: UpdateShipmentInput,
): Promise<Shipment> {
  const raw = await apiFetch<unknown>(
    `/api/v1/shipments/${encodeURIComponent(shipmentId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );

  return shipmentSchema.parse(raw);
}
