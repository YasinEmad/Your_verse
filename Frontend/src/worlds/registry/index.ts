import type { ComponentType, ReactNode } from "react";
import { DefaultLayout, DEFAULT_FONT_CLASS } from "./default";
import { AnimeLayout, ANIME_FONT_CLASS } from "./anime";
import { TechLayout, TECH_FONT_CLASS } from "./tech";
import { ChessLayout, CHESS_FONT_CLASS } from "./chess";
import { ArabicLayout, ARABIC_FONT_CLASS } from "./arabic";
import { GamingLayout, GAMING_FONT_CLASS } from "./gaming";

export interface WorldRegistryEntry {
  slug: string;
  Layout: ComponentType<{
    children: ReactNode;
    accent?: string;
  }>;
  fontClassName: string;
  direction: "ltr" | "rtl";
}

export const WORLD_REGISTRY: Record<string, WorldRegistryEntry> = {
  default: {
    slug: "default",
    Layout: DefaultLayout,
    fontClassName: DEFAULT_FONT_CLASS,
    direction: "ltr",
  },
  anime: {
    slug: "anime",
    Layout: AnimeLayout,
    fontClassName: ANIME_FONT_CLASS,
    direction: "ltr",
  },
  tech: {
    slug: "tech",
    Layout: TechLayout,
    fontClassName: TECH_FONT_CLASS,
    direction: "ltr",
  },
  chess: {
    slug: "chess",
    Layout: ChessLayout,
    fontClassName: CHESS_FONT_CLASS,
    direction: "ltr",
  },
  arabic: {
    slug: "arabic",
    Layout: ArabicLayout,
    fontClassName: ARABIC_FONT_CLASS,
    direction: "rtl",
  },
  gaming: {
    slug: "gaming",
    Layout: GamingLayout,
    fontClassName: GAMING_FONT_CLASS,
    direction: "ltr",
  },
};

export function getWorldRegistryEntry(slug: string): WorldRegistryEntry {
  return WORLD_REGISTRY[slug] ?? WORLD_REGISTRY.default;
}
