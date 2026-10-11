import { notFound } from "next/navigation";
import { renderSection } from "@/worlds/sections/render";
import { getWorldBySlug } from "@/lib/api/worlds";

export default async function WorldHome({
  params,
}: {
  params: { worldSlug: string };
}) {
  const world = await getWorldBySlug(params.worldSlug).catch(() => null);

  if (!world || world.status !== "ACTIVE") {
    notFound();
  }

  const sections = [...(world.sections ?? [])]
    .filter((section) => section.enabled)
    .sort((a, b) => a.position - b.position)
    .map((section) =>
      renderSection(section, { worldId: world.id, worldSlug: params.worldSlug }),
    )
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {sections.length > 0 ? sections : null}
    </main>
  );
}
