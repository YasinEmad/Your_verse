import { z } from "zod";
import { apiFetch } from "@/lib/api/client";

const cartVariantSchema = z
  .object({
    id: z.string().min(1),
    sku: z.string().min(1),
    price: z.union([z.number(), z.string()]).transform((value) => Number(value)),
    currency: z.string().default("USD"),
    attributes: z.record(z.string(), z.unknown()).default({}),
    inventory: z
      .object({
        id: z.string().min(1),
        quantity: z.number().int().nonnegative(),
        reserved: z.number().int().nonnegative(),
        available: z.number().int(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const cartProductSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    status: z.string(),
    worldId: z.string().min(1),
  })
  .passthrough();

export const cartItemSchema = z
  .object({
    id: z.string().min(1),
    variantId: z.string().min(1),
    quantity: z.number().int().positive(),
    product: cartProductSchema.nullable().optional(),
    variant: cartVariantSchema.nullable().optional(),
  })
  .passthrough();

export const cartSchema = z
  .object({
    id: z.string().nullable(),
    userId: z.string().nullable(),
    guestId: z.string().nullable().optional(),
    itemCount: z.number().int().nonnegative(),
    subtotal: z.number().nonnegative(),
    currency: z.string().default("USD"),
    items: z.array(cartItemSchema),
  })
  .passthrough();

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;

export async function getCart(): Promise<Cart> {
  const raw = await apiFetch<unknown>("/api/v1/cart");
  return cartSchema.parse(raw);
}

export async function addCartItem(variantId: string, quantity: number): Promise<Cart> {
  const raw = await apiFetch<unknown>("/api/v1/cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
  return cartSchema.parse(raw);
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  const raw = await apiFetch<unknown>(`/api/v1/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  return cartSchema.parse(raw);
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const raw = await apiFetch<unknown>(`/api/v1/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
  return cartSchema.parse(raw);
}