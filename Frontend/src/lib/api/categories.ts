import { z } from "zod";
import { apiFetch } from "./client";

const categorySchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
  })
  .passthrough();

export type Category = z.infer<typeof categorySchema>;

/**
 * `GET /api/v1/worlds/:worldId/categories` — the public category tree for a
 * World (parent + children included per row by the backend). We only need the
 * flat identity projection for navigation, so each row is parsed through the
 * minimal schema above and extra relation fields are let through by
 * `.passthrough()`.
 */
export async function listCategories(worldId: string): Promise<Category[]> {
  const raw = await apiFetch<unknown>(
    `/api/v1/worlds/${encodeURIComponent(worldId)}/categories`,
  );
  return z.array(categorySchema).parse(raw);
}