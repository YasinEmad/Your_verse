"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { renderSection } from "@/worlds/sections/render";

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.number(),
  enabled: z.boolean(),
  config: z.unknown(),
});

type SectionRow = z.infer<typeof sectionSchema>;

async function fetchSections(worldId: string): Promise<SectionRow[]> {
  const raw = await apiFetch<unknown>(`/api/v1/worlds/${worldId}/sections`);
  return z.array(sectionSchema).parse(raw);
}

async function saveReorder(worldId: string, sections: SectionRow[]) {
  const positions = sections.map((section, index) => ({
    id: section.id,
    position: index + 1,
  }));

  return apiFetch<unknown>(`/api/v1/worlds/${worldId}/sections/reorder`, {
    method: "PATCH",
    body: JSON.stringify(positions),
  });
}

async function updateSection(worldId: string, sectionId: string, patch: Partial<{ enabled: boolean; config: unknown }>) {
  return apiFetch<unknown>(`/api/v1/worlds/${worldId}/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export default function AdminSectionEditorPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = params.worldId;
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<SectionRow[]>([]);

  const sectionsQuery = useQuery({
    queryKey: ["admin-sections", worldId],
    queryFn: () => fetchSections(worldId),
    enabled: Boolean(worldId),
    retry: 1,
  });

  const reorderMutation = useMutation({
    mutationFn: () => saveReorder(worldId, sections),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sections", worldId] });
    },
  });

  const liveSections = useMemo(() => {
    if (sectionsQuery.data && sections.length === 0) {
      setSections(sectionsQuery.data);
    }
    return sections.length > 0 ? sections : sectionsQuery.data ?? [];
  }, [sections, sectionsQuery.data]);

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...liveSections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSections(next);
  };

  const handleToggle = async (sectionId: string, enabled: boolean) => {
    const next = liveSections.map((section) =>
      section.id === sectionId ? { ...section, enabled } : section,
    );
    setSections(next);
    await updateSection(worldId, sectionId, { enabled });
  };

  const handleConfigChange = async (sectionId: string, rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue);
      const next = liveSections.map((section) =>
        section.id === sectionId ? { ...section, config: parsed } : section,
      );
      setSections(next);
      await updateSection(worldId, sectionId, { config: parsed });
    } catch {
      // Keep editing local draft; invalid JSON is rejected before save.
    }
  };

  if (!worldId) {
    return <p className="p-8 text-slate-500">Missing world id.</p>;
  }

  return (
    <main className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="text-3xl font-bold text-slate-900">Section Editor</h1>
        </div>
        <button
          type="button"
          onClick={() => reorderMutation.mutate()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {reorderMutation.isPending ? "Saving…" : "Save order"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {sectionsQuery.isLoading ? (
            <p className="text-slate-500">Loading sections…</p>
          ) : liveSections.length === 0 ? (
            <p className="text-slate-500">No sections configured for this world.</p>
          ) : (
            liveSections.map((section, index) => (
              <div key={section.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {section.type}
                    </p>
                    <p className="text-sm text-slate-600">Position {index + 1}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    >
                      ↓
                    </button>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(event) => handleToggle(section.id, event.target.checked)}
                      />
                      Enabled
                    </label>
                  </div>
                </div>

                <textarea
                  value={JSON.stringify(section.config, null, 2)}
                  onChange={(event) => handleConfigChange(section.id, event.target.value)}
                  className="h-32 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Live preview</h2>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {liveSections
              .filter((section) => section.enabled)
              .sort((a, b) => a.position - b.position)
              .map((section) => renderSection({ ...section, config: section.config }))}
          </div>
        </div>
      </div>
    </main>
  );
}
