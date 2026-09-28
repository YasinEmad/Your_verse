import { worldLayout } from "./withFont";

export const CHESS_FONT_CLASS = "font-serif";

/**
 * Warm near-black instead of the old parchment cream. The warmth is kept at a
 * very low lightness so the amber accent and the board's dark squares stay the
 * brightest things on the page.
 */
export const ChessLayout = worldLayout(
  "ChessLayout",
  "min-h-screen bg-[#0b0a09] text-foreground",
  CHESS_FONT_CLASS,
  { accent: "hsl(38 92% 58%)", onAccent: "hsl(38 90% 8%)" },
);
