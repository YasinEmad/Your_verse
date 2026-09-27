import { worldLayout } from "./withFont";

export const CHESS_FONT_CLASS = "font-serif";

export const ChessLayout = worldLayout(
  "ChessLayout",
  "min-h-screen bg-[#f5efe6] text-slate-900",
  CHESS_FONT_CLASS,
);
