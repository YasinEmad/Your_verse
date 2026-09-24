import type { ComponentType } from "react";
import { z } from "zod";
import { Hero } from "./shared/Hero";
import { ProductGrid } from "./shared/ProductGrid";
import { Collection } from "./shared/Collection";
import { FeatureSection } from "./shared/FeatureSection";
import { ProductComparison } from "./shared/ProductComparison";
import { CharacterShowcase } from "./anime/CharacterShowcase";
import { ChessBoard } from "./chess/ChessBoard";

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
  }),
} as const;

export type SectionType = keyof typeof sectionSchemas;

export type SectionConfigMap = {
  [K in SectionType]: z.infer<typeof sectionSchemas[K]>;
};

export type SectionConfig = {
  [K in SectionType]: { type: K; config: SectionConfigMap[K] };
}[SectionType];

export type SectionComponentProps<K extends SectionType> = {
  config: SectionConfigMap[K];
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
  chess_board: ChessBoard,
};