import React, { type ComponentType, type ReactNode } from "react";

export interface WorldRegistryEntry {
  slug: string;
  Layout: ComponentType<{ children: ReactNode }>;
  fontClassName: string;
  direction: "ltr" | "rtl";
}

function DefaultLayout({ children }: { children: ReactNode }) {
  return React.createElement("div", { className: "min-h-screen bg-slate-50 text-slate-900" }, children);
}

const AnimeLayout = ({ children }: { children: ReactNode }) =>
  React.createElement(
    "div",
    { className: "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white" },
    children,
  );

const TechLayout = ({ children }: { children: ReactNode }) =>
  React.createElement("div", { className: "min-h-screen bg-slate-950 text-slate-100" }, children);

const ChessLayout = ({ children }: { children: ReactNode }) =>
  React.createElement("div", { className: "min-h-screen bg-[#f6f1e7] text-slate-900" }, children);

const ArabicLayout = ({ children }: { children: ReactNode }) =>
  React.createElement("div", { className: "min-h-screen bg-[#f8f3ee] text-slate-900" }, children);

const GamingLayout = ({ children }: { children: ReactNode }) =>
  React.createElement("div", { className: "min-h-screen bg-[#0b1020] text-slate-100" }, children);

export const WORLD_REGISTRY: Record<string, WorldRegistryEntry> = {
  default: {
    slug: "default",
    Layout: DefaultLayout,
    fontClassName: "font-sans",
    direction: "ltr",
  },
  anime: {
    slug: "anime",
    Layout: AnimeLayout,
    fontClassName: "font-sans",
    direction: "ltr",
  },
  tech: {
    slug: "tech",
    Layout: TechLayout,
    fontClassName: "font-mono",
    direction: "ltr",
  },
  chess: {
    slug: "chess",
    Layout: ChessLayout,
    fontClassName: "font-sans",
    direction: "ltr",
  },
  arabic: {
    slug: "arabic",
    Layout: ArabicLayout,
    fontClassName: "font-sans",
    direction: "rtl",
  },
  gaming: {
    slug: "gaming",
    Layout: GamingLayout,
    fontClassName: "font-sans",
    direction: "ltr",
  },
};

export function getWorldRegistryEntry(slug: string): WorldRegistryEntry {
  return WORLD_REGISTRY[slug] ?? WORLD_REGISTRY.default;
}

