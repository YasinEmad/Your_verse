import React, { type ReactNode } from "react";

export function TechLayout({ children }: { children: ReactNode }) {
  return React.createElement("div", { className: "min-h-screen bg-slate-950 text-slate-100" }, children);
}
