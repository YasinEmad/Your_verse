import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getWorldBySlug } from "@/lib/api/worlds";
import { getWorldRegistryEntry } from "@/worlds/registry";

export default async function StoreWorldLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { worldSlug: string };
}) {
  const world = await getWorldBySlug(params.worldSlug).catch(() => null);

  if (!world || world.status !== "ACTIVE") {
    notFound();
  }

  const entry = getWorldRegistryEntry(world.slug);
  const worldAccent = world.themeTokens?.colors?.accent?.trim();
  const worldBackground = world.themeTokens?.colors?.background?.trim();
  const cssVars = {
    // Still exposed as data (§5 "cosmetic, safe to be fully dynamic") so any
    // section can read the World's own colours. Empty when the World never
    // defined them, which is why nothing is allowed to depend on them existing.
    "--world-accent": worldAccent || "transparent",
    "--world-bg": worldBackground || "transparent",
  } as React.CSSProperties;

  const Layout = entry.Layout;

  // The API stores `direction` as a Postgres enum ("LTR"/"RTL") while the
  // registry and HTML both speak lowercase, so normalize once here — a World
  // created from the Super-Admin dashboard must flip RTL exactly like a seeded
  // one (frontend-architecture.md §27).
  const direction = (world.direction ?? entry.direction).toLowerCase();

  return (
    <div dir={direction} style={cssVars}>
      {/*
        The World's own accent is handed to its registry layout rather than
        written as a CSS variable here: the layout decides how much of it is safe
        to use, and an inline variable on this wrapper would be shadowed by the
        layout's own declarations further down the tree. The layout uses it for a
        non-textual glow only, keeping its own contrast-checked accent on
        `--primary`/`--ring`.
      */}
      <Layout accent={worldAccent || undefined}>{children}</Layout>
    </div>
  );
}
