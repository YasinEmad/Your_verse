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
  const cssVars = {
    "--world-accent": world.themeTokens?.colors?.accent ?? "#2563eb",
    "--world-bg": world.themeTokens?.colors?.background ?? "#f8fafc",
  } as React.CSSProperties;

  const Layout = entry.Layout;

  // The API stores `direction` as a Postgres enum ("LTR"/"RTL") while the
  // registry and HTML both speak lowercase, so normalize once here — a World
  // created from the Super-Admin dashboard must flip RTL exactly like a seeded
  // one (frontend-architecture.md §27).
  const direction = (world.direction ?? entry.direction).toLowerCase();

  return (
    <div dir={direction} style={cssVars}>
      <Layout>{children}</Layout>
    </div>
  );
}
