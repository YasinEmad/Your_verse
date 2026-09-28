import { Noto_Kufi_Arabic } from "next/font/google";
import { worldLayout } from "./withFont";

const arabicFont = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const ARABIC_FONT_CLASS = `font-[family-name:var(--font-arabic)] ${arabicFont.variable}`;

/** Warm black with a sand-toned accent, mirroring the old cream palette. */
export const ArabicLayout = worldLayout(
  "ArabicLayout",
  "min-h-screen bg-[#0a0908] text-foreground",
  ARABIC_FONT_CLASS,
  { accent: "hsl(35 60% 62%)", onAccent: "hsl(35 60% 8%)" },
);
