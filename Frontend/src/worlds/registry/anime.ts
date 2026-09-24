import React, { type ReactNode } from "react";

export function AnimeLayout({ children }: { children: ReactNode }) {
  return React.createElement("div", { className: "min-h-screen bg-slate-950 text-white" }, children);
}
