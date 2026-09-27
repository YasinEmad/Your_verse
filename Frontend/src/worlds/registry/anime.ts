import { worldLayout } from "./withFont";

export const ANIME_FONT_CLASS = "font-sans";

export const AnimeLayout = worldLayout(
  "AnimeLayout",
  "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white",
  ANIME_FONT_CLASS,
);
