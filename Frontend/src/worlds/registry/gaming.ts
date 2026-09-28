import { worldLayout } from "./withFont";

export const GAMING_FONT_CLASS = "font-sans";

/**
 * Deep blue-black rather than flat black: the extra hue keeps neon accents (the
 * World's theme tokens) from looking washed out against a neutral canvas.
 */
export const GamingLayout = worldLayout(
  "GamingLayout",
  "min-h-screen bg-[#05070f] text-foreground",
  GAMING_FONT_CLASS,
  { accent: "hsl(330 90% 62%)", onAccent: "hsl(330 80% 8%)" },
);
