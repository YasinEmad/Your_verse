/**
 * worldImages — TEMPORARY picture lookup for the Home rail.
 *
 * This is the one place that knows which Worlds have a local picture, so
 * `WorldCard` and `page.tsx` stay free of World names. It breaks the "no slug
 * keys" rule on purpose, because the two images only exist as local files.
 *
 * Replace it when the API carries an image per World: add `imageUrl` to
 * `PublicWorld`, pass `image={world.imageUrl}` in `page.tsx`, and delete this
 * file. `WorldCard` already accepts a URL string.
 */
import type { StaticImageData } from "next/image";
import techHero from "@/components/techHero.jpg";
import chessHero from "@/components/chessHero.jpeg";
import animeHero from "@/components/anime1.jpeg";
import arabHero from "@/components/arab.jpg";
import gamingHero from "@/components/gaming.jpeg";

const IMAGES: Record<string, StaticImageData> = {
  tech: techHero,
  chess: chessHero,
  anime: animeHero,
  arabic: arabHero,
  gaming: gamingHero,
};

export function imageForWorld(slug: string): StaticImageData | undefined {
  return IMAGES[slug];
}