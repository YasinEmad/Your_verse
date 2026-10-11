import { z } from "zod";
import { apiFetch } from "@/lib/api/client";

export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string().optional(),
  variantId: z.string(),
  worldId: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  variant: z
    .object({
      id: z.string(),
      sku: z.string(),
      price: z.number(),
      currency: z.string(),
      attributes: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  recipientName: z.string().nullable().optional(),
  recipientPhone: z.string().nullable().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).nullable().optional(),
  items: z.array(orderItemSchema),
  // Cash on delivery: the payment stays PENDING from checkout until the parcel
  // is delivered, at which point the backend flips both it and the order to
  // PAID. There is no client-callable way to pay an order.
  payment: z
    .object({
      id: z.string(),
      status: z.string(),
      provider: z.string(),
      amount: z.number(),
    })
    .nullable()
    .optional(),
  shipment: z
    .object({
      id: z.string(),
      status: z.string(),
      trackingNumber: z.string().nullable().optional(),
      carrier: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Order = z.infer<typeof orderSchema>;

export async function listOrders(): Promise<Order[]> {
  const raw = await apiFetch<unknown>("/api/v1/orders");
  return z.array(orderSchema).parse(raw);
}

/** Delivery details collected on the checkout form and stamped on the order. */
export interface CheckoutDetailsInput {
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: Record<string, unknown>;
}

/**
 * `POST /orders` requires an `Idempotency-Key`, and the caller must keep the
 * same key for every retry of the same checkout — that is what stops a double
 * click, or a retry after a dropped response, from placing two orders. The
 * optional body carries the cash-on-delivery destination (a customer cannot
 * amend it later through `PATCH /orders`, which is an admin route).
 */
export async function createOrder(
  idempotencyKey: string,
  details?: CheckoutDetailsInput,
): Promise<Order> {
  const raw = await apiFetch<unknown>("/api/v1/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    ...(details ? { body: JSON.stringify(details) } : {}),
  });
  return orderSchema.parse(raw);
}

export async function getOrder(id: string): Promise<Order> {
  const raw = await apiFetch<unknown>(`/api/v1/orders/${id}`);
  return orderSchema.parse(raw);
}
