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
    .map((section) => renderSection(section))
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">World</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{world.name}</h1>
      </header>

      {sections.length > 0 ? sections : <p className="text-slate-500">No active sections configured for this world.</p>}
    </main>
  );
}
