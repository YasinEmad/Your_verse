import { z } from "zod";
import { apiFetch } from "./client";

const productVariantPriceSchema = z.union([z.number(), z.string()]).transform((value) => Number(value));

export const productVariantInventorySchema = z
  .object({
    id: z.string().min(1).optional(),
    quantity: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative().default(0),
  })
  .passthrough()
  .nullable()
  .optional();

export const productVariantSchema = z
  .object({
    id: z.string().min(1).optional(),
    sku: z.string().min(1),
    price: productVariantPriceSchema,
    attributes: z.record(z.string(), z.unknown()).default({}),
    inventory: productVariantInventorySchema,
  })
  .passthrough();

export const productImageSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().min(1),
    altText: z.string().nullable().optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const productCategorySchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
  })
  .passthrough();

export const productSchema = z
  .object({
    id: z.string().min(1),
    worldId: z.string().min(1),
    categoryId: z.string().min(1),
    category: productCategorySchema.optional(),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().default(""),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).or(z.string()).default("DRAFT"),
    variants: z.array(productVariantSchema).default([]),
    images: z.array(productImageSchema).default([]),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough();

export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;

export interface ProductListFilters {
  categoryId?: string;
  status?: string;
}

export async function listProducts(
  worldId: string,
  filters: ProductListFilters = {},
): Promise<Product[]> {
  const params = new URLSearchParams();

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  const path = `/api/v1/worlds/${encodeURIComponent(worldId)}/products${query ? `?${query}` : ""}`;
  const raw = await apiFetch<unknown>(path);

  return z.array(productSchema).parse(raw);
}

export async function getProductBySlug(worldId: string, slug: string): Promise<Product> {
  const raw = await apiFetch<unknown>(`/api/v1/worlds/${encodeURIComponent(worldId)}/products/${encodeURIComponent(slug)}`);
  return productSchema.parse(raw);
}
