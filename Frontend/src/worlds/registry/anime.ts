import { worldLayout } from "./withFont";

export const ANIME_FONT_CLASS = "font-sans";

/**
 * The gradient starts at pure black so it meets the app shell's canvas without a
 * seam, and only warms into violet as the page is scrolled.
 */
export const AnimeLayout = worldLayout(
  "AnimeLayout",
  "min-h-screen bg-gradient-to-b from-black via-[#0d0a1f] to-[#150f33] text-foreground",
  ANIME_FONT_CLASS,
  { accent: "hsl(272 90% 72%)", onAccent: "hsl(272 80% 8%)" },
);
