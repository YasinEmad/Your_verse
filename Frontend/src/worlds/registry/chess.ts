import React, { type ReactNode } from "react";

export function ChessLayout({ children }: { children: ReactNode }) {
  return React.createElement("div", { className: "min-h-screen bg-[#f5efe6] text-slate-900" }, children);
}
