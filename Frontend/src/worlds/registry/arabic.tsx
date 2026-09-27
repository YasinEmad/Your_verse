import { Noto_Kufi_Arabic } from "next/font/google";
import { worldLayout } from "./withFont";

const arabicFont = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const ARABIC_FONT_CLASS = `font-[family-name:var(--font-arabic)] ${arabicFont.variable}`;

export const ArabicLayout = worldLayout(
  "ArabicLayout",
  "min-h-screen bg-[#f8f3ee] text-slate-900",
  ARABIC_FONT_CLASS,
);
