/**
 * Section types the API will accept for a World's composition.
 *
 * The *source of truth* for section types is the frontend Section Registry
 * (`Frontend/src/worlds/sections/registry.ts`): per frontend-architecture.md
 * §5, section **implementation** — and therefore the set of types that can
 * actually render — lives in code on the frontend, and `renderSection` (§17)
 * validates each config authoritatively at render time.
 *
 * This list exists only to reject obvious typos/garbage from the Admin section
 * editor. It deliberately mirrors the registry keys so the two cannot drift
 * silently; `scripts/f11_world_catalog_check.js` asserts that equality, and
 * adding a new section type means adding its key to *both* places (a one-line
 * change each, per §19).
 *
 * Section *config* is intentionally not validated here beyond "must be a JSON
 * object" — owning config shapes would duplicate the Zod schemas that already
 * exist once on the frontend.
 */
export const KNOWN_SECTION_TYPES = [
  'hero',
  'product_grid',
  'collection',
  'feature_section',
  'product_comparison',
  'character_showcase',
  'chess_hero',
  'chess_board',
] as const;

export type KnownSectionType = (typeof KNOWN_SECTION_TYPES)[number];

export function isKnownSectionType(value: string): value is KnownSectionType {
  return (KNOWN_SECTION_TYPES as readonly string[]).includes(value);
}
