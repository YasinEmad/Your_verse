import { worldLayout } from "./withFont";

export const DEFAULT_FONT_CLASS = "font-sans";

export const DefaultLayout = worldLayout(
  "DefaultLayout",
  "min-h-screen bg-black text-foreground",
  DEFAULT_FONT_CLASS,
  { accent: "hsl(250 90% 68%)", onAccent: "hsl(250 80% 8%)" },
);
