import { cache } from "react";
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
  // `cache: "no-store"` on purpose: the World payload *is* the composition, and
  // composition changes (Admin's section editor, Super Admin creating/deleting a
  // World) must be visible on the storefront on the very next request. Without
  // it Next's fetch cache would happily serve a pre-edit — or a pre-creation —
  // 404 for as long as the entry stays fresh.
  const raw = await apiFetch<unknown>(`/api/v1/worlds/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  return worldPayloadSchema.parse(raw);
}

/**
 * Super-Admin World list — identity only (F9, frontend-architecture.md §29).
 * Deliberately a *different* shape and query key from the storefront's
 * `["world", slug]`: composition (which sections exist) is Admin's concern and
 * is not part of this payload, only a `sectionCount` for context.
 */
export const worldSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).or(z.string()),
  direction: z.enum(["ltr", "rtl", "LTR", "RTL"]).or(z.string()),
  locale: z.string().nullable().optional(),
  themeTokens: worldThemeTokensSchema.optional().default({}),
  capabilities: z.record(z.string(), z.boolean()).default({}),
  sectionCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().optional(),
});

export type WorldSummary = z.infer<typeof worldSummarySchema>;

/**
 * The one definition of "what a new World's identity fields may contain". It is
 * used twice on purpose: as the React Hook Form resolver on the Super-Admin
 * create form (§21) and as the input validation in `createWorld()` (§16). One
 * schema, so the form can never accept something the API layer then rejects.
 */
export const worldThemeTokensInputSchema = z
  .object({
    colors: z
      .object({
        accent: z
          .string()
          .trim()
          .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #2563eb")
          .optional()
          .or(z.literal("")),
        background: z
          .string()
          .trim()
          .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #0b1020")
          .optional()
          .or(z.literal("")),
      })
      .optional(),
    radius: z.string().optional(),
  })
  .optional();

export const createWorldInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug needs at least 2 characters")
    .max(64, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case, e.g. retro-arcade"),
  name: z.string().trim().min(2, "Name is required").max(80, "Name is too long"),
  locale: z
    .string()
    .trim()
    .min(2, "Locale looks empty")
    .max(16, "Locale is too long")
    .default("en"),
  direction: z.enum(["ltr", "rtl"]).default("ltr"),
  themeTokens: worldThemeTokensInputSchema,
  capabilities: z.record(z.string(), z.boolean()).default({}),
});

export type CreateWorldInput = z.input<typeof createWorldInputSchema>;

/** `GET /api/v1/worlds` — SUPER_ADMIN only (backend gate, not a UI decision). */
export async function listWorlds(): Promise<WorldSummary[]> {
  const raw = await apiFetch<unknown>("/api/v1/worlds", { cache: "no-store" });
  return z.array(worldSummarySchema).parse(raw);
}

/**
 * Public World index — `GET /api/v1/worlds/public`. The unauthenticated
 * projection of the same rows `listWorlds()` returns, narrowed to ACTIVE Worlds
 * with no `sectionCount`/`createdAt` (lifecycle bookkeeping the storefront has
 * no use for) and never the section composition.
 *
 * This is the **one** World-listing function shared chrome may use: the Navbar's
 * world switcher and the Home grid both read it, so neither can grow its own
 * fetch (and neither can drift from the other). It is a *different* function
 * from `listWorlds()` on purpose — that one is the Super-Admin lifecycle list,
 * and reusing it here would make the storefront depend on a role-gated route
 * (403 for every anonymous visitor) and leak INACTIVE Worlds into public links.
 */
export const publicWorldSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).or(z.string()),
  direction: z.enum(["ltr", "rtl", "LTR", "RTL"]).or(z.string()),
  locale: z.string().nullable().optional(),
  themeTokens: worldThemeTokensSchema.optional().default({}),
  capabilities: z.record(z.string(), z.boolean()).default({}),
});

export type PublicWorld = z.infer<typeof publicWorldSchema>;

async function fetchPublicWorlds(): Promise<PublicWorld[]> {
  // `no-store` for the same reason as `getWorldBySlug`: a World created in
  // Super Admin must show up in the switcher and the Home grid on the very next
  // request, with no revalidate window in between.
  const raw = await apiFetch<unknown>("/api/v1/worlds/public", { cache: "no-store" });

  return z.array(publicWorldSchema).parse(raw).map((world) => {
    const shouldNormalizeToTech =
      world.slug.toLowerCase() === "gaming" || world.name.toLowerCase().includes("gaming");

    if (!shouldNormalizeToTech) {
      return world;
    }

    return {
      ...world,
      slug: "tech",
      name: "Tech",
    };
  });
}

/**
 * `listActiveWorlds()` — React `cache()` wrapper around the public index, so the
 * Navbar (root layout) and the Home page (which are rendered in the same
 * request) resolve to **one** network call instead of two.
 *
 * It never throws. The Navbar sits above `{children}` in the root layout, so an
 * `ApiError` escaping here would turn an unreachable backend or a transient 5xx
 * into a 500 on *every* route in the app. An empty list degrades to a hidden
 * switcher and the Home empty state instead, and the underlying error is
 * reported on the server console for the Next.js log.
 *
 * The try/catch deliberately swallows validation failures too: `§16`'s Zod parse
 * is a contract guard, not a reason for shared chrome to take down the page.
 *
 * One exception is re-thrown: Next's `DYNAMIC_SERVER_USAGE` "bail out of static
 * rendering" signal, which arrives here during `next build` precisely *because*
 * of the `no-store` above. It is control flow, not a failure — swallowing it
 * would only log a scary error for the expected case, and the route ends up
 * dynamic either way.
 *
 * Server Components only — `cache()` has no client-side runtime, and nothing
 * here needs one. A Client Component that wanted this list should go through a
 * TanStack Query hook against the same `fetchPublicWorlds()` shape instead
 * (`§10`: the server owns the World's identity list for the first paint).
 */
export const listActiveWorlds = cache(async (): Promise<PublicWorld[]> => {
  try {
    return await fetchPublicWorlds();
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }
    console.error("[worlds] public World index unavailable:", error);
    return [];
  }
});

/**
 * `POST /api/v1/worlds` — identity fields only. No `world_sections` in this
 * payload by design (F9 "Do NOT"): a World created here is immediately live at
 * `/<slug>` with the default WORLD_REGISTRY layout and *zero* sections until an
 * Admin composes it through the section editor.
 */
export async function createWorld(input: CreateWorldInput): Promise<WorldSummary> {
  const payload = createWorldInputSchema.parse(input);
  const raw = await apiFetch<unknown>("/api/v1/worlds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return worldSummarySchema.parse(raw);
}

/**
 * `PATCH /api/v1/worlds/:id` — lifecycle switch (ACTIVE ⇄ INACTIVE) only.
 * Deactivating is the reversible half of "World lifecycle": the storefront
 * 404s an INACTIVE World without destroying its composition.
 */
export async function updateWorldStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<WorldSummary> {
  const raw = await apiFetch<unknown>(`/api/v1/worlds/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return worldSummarySchema.parse(raw);
}

/** `DELETE /api/v1/worlds/:id` — permanent, so callers must confirm first. */
export async function deleteWorld(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/worlds/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
