import { z } from "zod";
import { apiFetch } from "./client";

export const worldSectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
  config: z.unknown(),
});

export const worldThemeTokensSchema = z
  .object({
    colors: z.record(z.string(), z.string()).optional(),
    radius: z.string().optional(),
  })
  .passthrough();

export const worldPayloadSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).or(z.string()),
  direction: z.enum(["ltr", "rtl"]).or(z.string()),
  locale: z.string().nullable().optional(),
  themeTokens: worldThemeTokensSchema.optional().default({}),
  capabilities: z.record(z.string(), z.boolean()).default({}),
  sections: z.array(worldSectionSchema).default([]),
});

export type WorldSection = z.infer<typeof worldSectionSchema>;
export type WorldPayload = z.infer<typeof worldPayloadSchema>;

export async function getWorldBySlug(slug: string): Promise<WorldPayload> {
  const raw = await apiFetch<unknown>(`/api/v1/worlds/${encodeURIComponent(slug)}`);
  return worldPayloadSchema.parse(raw);
}
