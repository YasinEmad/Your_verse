import { worldLayout } from "./withFont";

export const TECH_FONT_CLASS = "font-mono";

export const TechLayout = worldLayout(
  "TechLayout",
  "min-h-screen bg-black text-foreground",
  TECH_FONT_CLASS,
  { accent: "hsl(190 90% 55%)", onAccent: "hsl(200 90% 6%)" },
);
