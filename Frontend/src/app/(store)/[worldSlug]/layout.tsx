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

  return (
    <div dir={world.direction ?? entry.direction} style={cssVars}>
      <Layout>{children}</Layout>
    </div>
  );
}
