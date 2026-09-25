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
});

export type Order = z.infer<typeof orderSchema>;

export async function listOrders(): Promise<Order[]> {
  const raw = await apiFetch<unknown>("/api/v1/orders");
  return z.array(orderSchema).parse(raw);
}

export async function createOrder(): Promise<Order> {
  const raw = await apiFetch<unknown>("/api/v1/orders", { method: "POST" });
  return orderSchema.parse(raw);
}

export async function getOrder(id: string): Promise<Order> {
  const raw = await apiFetch<unknown>(`/api/v1/orders/${id}`);
  return orderSchema.parse(raw);
}

export async function payOrder(id: string, provider: string, providerRef: string, amount: number): Promise<Order> {
  const raw = await apiFetch<unknown>(`/api/v1/orders/${id}/pay`, {
    method: "POST",
    body: JSON.stringify({ provider, providerRef, amount }),
  });
  return orderSchema.parse(raw);
}
