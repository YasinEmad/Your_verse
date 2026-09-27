import { z } from "zod";
import { apiFetch } from "@/lib/api/client";

export const orderItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
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

/**
 * `POST /orders` requires an `Idempotency-Key`, and the caller must keep the
 * same key for every retry of the same checkout — that is what stops a double
 * click, or a retry after a dropped response, from placing two orders.
 */
export async function createOrder(idempotencyKey: string): Promise<Order> {
  const raw = await apiFetch<unknown>("/api/v1/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return orderSchema.parse(raw);
}

export async function getOrder(id: string): Promise<Order> {
  const raw = await apiFetch<unknown>(`/api/v1/orders/${id}`);
  return orderSchema.parse(raw);
}
