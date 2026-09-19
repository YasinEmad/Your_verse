import type { ComponentType } from "react";

/**
 * Section Registry — frontend-architecture.md §17.
 *
 * Phase 1 owns only the *shape*: the `SectionType` key set plus the
 * schema→component contract. No Zod schemas or registered components exist yet
 * (those land in Phase 4 §5/§17). Keep this file dependency-free and content
 * free so later phases fill exactly two places: the schema map and the
 * component map.
 */
export const SECTION_TYPES = [
  "hero",
  "product_grid",
  "collection",
  "feature_section",
  "product_comparison",
  "character_showcase",
  "chess_board",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** One section type → one schema + one component (contract only, §17). */
export type SectionComponentMap = {
  [K in SectionType]: ComponentType<{ config: never }>;
};

/** Populated in Phase 4. */
export const SECTION_COMPONENTS: Partial<SectionComponentMap> = {};

/**
 * Generic renderer — §17. Never branches on World, only on `type` via the
 * registry lookup. Returns `null` (with a console warning) instead of throwing
 * on unknown types / invalid config so one bad Admin edit can't 500 a World
 * page. Phase 1: no-op stub; the real Zod-safeParse + registry lookup lands in
 * Phase 4 (where it regains its `raw` param + typing).
 */
export function renderSection(): null {
  return null;
}