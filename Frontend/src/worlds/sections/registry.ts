import type { ComponentType } from "react";
import { z } from "zod";
import { Hero } from "./shared/Hero";
import { ProductGrid } from "./shared/ProductGrid";
import { Collection } from "./shared/Collection";
import { FeatureSection } from "./shared/FeatureSection";
import { ProductComparison } from "./shared/ProductComparison";
import { CharacterShowcase } from "./anime/CharacterShowcase";
import { ChessBoard } from "./chess/ChessBoard";
import { ChessHero } from "./chess/ChessHero";
import { TechHero } from "./tech/TechHero";
import { TechRealms } from "./tech/TechRealms";

export const sectionSchemas = {
  hero: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    imageUrl: z.string().url(),
  }),
  product_grid: z.object({
    title: z.string(),
    limit: z.number().min(1).max(50),
    categorySlug: z.string().optional(),
  }),
  collection: z.object({
    collectionSlug: z.string(),
  }),
  feature_section: z.object({
    features: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
        icon: z.string(),
      }),
    ),
  }),
  product_comparison: z.object({
    productIds: z.array(z.string()).min(2).max(4),
  }),
  character_showcase: z.object({
    characterIds: z.array(z.string()),
  }),
  chess_board: z.object({
    mode: z.enum(["preview", "puzzle"]),
    title: z.string().optional(),
    startFen: z.string().optional(),
    showCoordinates: z.boolean().optional(),
  }),
  chess_hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    imageUrl: z.string().url().optional(),
    stats: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      )
      .max(4)
      .optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
  }),
  tech_hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    stats: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      )
      .max(4)
      .optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
  }),
  tech_realms: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
    realms: z
      .array(
        z.object({
          title: z.string(),
          blurb: z.string(),
          href: z.string().optional(),
          icon: z.enum(["chip", "orbit", "wave", "terminal"]).optional(),
          accent: z.enum(["cyan", "violet", "blue", "fuchsia"]).optional(),
        }),
      )
      .optional(),
    ticker: z.array(z.string()).optional(),
  }),
} as const;

export type SectionType = keyof typeof sectionSchemas;

export type SectionConfigMap = {
  [K in SectionType]: z.infer<typeof sectionSchemas[K]>;
};

export type SectionConfig = {
  [K in SectionType]: { type: K; config: SectionConfigMap[K] };
}[SectionType];

/**
 * A section's props are its validated config plus an optional `worldId` (the
 * backing World row, supplied by the render pipeline). Sections that render
 * live product data read it; purely presentational sections ignore it, so the
 * field is optional and every existing component keeps working unchanged.
 */
export type SectionComponentProps<K extends SectionType> = {
  config: SectionConfigMap[K];
  worldId?: string;
};

export const SECTION_COMPONENTS: {
  [K in SectionType]: ComponentType<SectionComponentProps<K>>;
} = {
  hero: Hero,
  product_grid: ProductGrid,
  collection: Collection,
  feature_section: FeatureSection,
  product_comparison: ProductComparison,
  character_showcase: CharacterShowcase,
  chess_hero: ChessHero,
  chess_board: ChessBoard,
  tech_hero: TechHero,
  tech_realms: TechRealms,
};