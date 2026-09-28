"use client";

/**
 * `/super-admin/worlds` — World lifecycle, identity only (Phase 9,
 * frontend-architecture.md §29).
 *
 * What this page may touch: a World's *identity* — slug, name, locale,
 * direction, theme tokens, and whether it is live at all. What it must never
 * touch: `world_sections`. Composing a World is Admin's job through the section
 * editor (Phase 8), so a World created here starts with zero sections and is
 * immediately reachable at `/<slug>` using the default WORLD_REGISTRY layout
 * (frontend-architecture.md §18 step 1–2) with no code deploy.
 *
 * Authorization is enforced by the backend; this page is gated only so a
 * non-SUPER_ADMIN never sees a form that would 403 on submit.
 */
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import {
  createWorldInputSchema,
  useCreateWorld,
  useDeleteWorld,
  useUpdateWorldStatus,
  useWorlds,
} from "@/features/worlds";

type WorldFormValues = z.infer<typeof createWorldInputSchema>;

const DEFAULT_VALUES: WorldFormValues = {
  slug: "",
  name: "",
  locale: "en",
  direction: "ltr",
  themeTokens: { colors: { accent: "", background: "" } },
  capabilities: {},
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = Array.isArray(error.message)
      ? error.message.join(" ")
      : error.message;
    return `${fallback} (${error.status}) ${detail}`.trim();
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function SuperAdminWorldsPage() {
  const worldsQuery = useWorlds();
  const createWorldMutation = useCreateWorld();
  const statusMutation = useUpdateWorldStatus();
  const deleteMutation = useDeleteWorld();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorldFormValues>({
    resolver: zodResolver(createWorldInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onCreate = handleSubmit(async (values) => {
    // Empty colour inputs are valid per the form schema (nothing typed yet) but
    // are not valid theme tokens for the API, so drop them before sending.
    const colors = Object.fromEntries(
      Object.entries(values.themeTokens?.colors ?? {}).filter(
        (entry): entry is [string, string] => Boolean(entry[1]),
      ),
    );

    await createWorldMutation
      .mutateAsync(
        {
          slug: values.slug,
          name: values.name,
          locale: values.locale,
          direction: values.direction,
          capabilities: values.capabilities,
          ...(Object.keys(colors).length > 0 ? { themeTokens: { colors } } : {}),
        },
        { onSuccess: () => reset(DEFAULT_VALUES) },
      )
      // The failure is already rendered from the mutation's `isError` state;
      // swallow the rejection here so it isn't also an unhandled promise.
      .catch(() => undefined);
  });

  const confirmDelete = (worldId: string, slug: string, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}" (/${slug})? This removes its products and sections permanently.`,
    );
    if (!confirmed) return;

    setPendingDeleteId(worldId);
    deleteMutation
      .mutateAsync({ id: worldId, slug })
      .catch(() => undefined)
      .finally(() => setPendingDeleteId(null));
  };

  return (
    <main className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Worlds</h1>
          <p className="text-sm text-muted-foreground">
            Identity and lifecycle only — composing a World&apos;s sections is Admin&apos;s job.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Go to Admin
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Create a World</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          A new World is live at <code className="text-xs">/&lt;slug&gt;</code> immediately, with
          the default layout and no sections until an Admin composes it.
        </p>

        <form onSubmit={onCreate} noValidate className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium text-foreground">
            Name
            <input
              {...register("name")}
              placeholder="Retro Arcade"
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {errors.name && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.name.message}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-foreground">
            Slug
            <input
              {...register("slug")}
              placeholder="retro-arcade"
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {errors.slug && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.slug.message}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-foreground">
            Locale
            <input
              {...register("locale")}
              placeholder="en"
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {errors.locale && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.locale.message}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-foreground">
            Direction
            <select
              {...register("direction")}
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="ltr">Left to right</option>
              <option value="rtl">Right to left</option>
            </select>
            {errors.direction && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.direction.message}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-foreground">
            Accent colour
            <input
              {...register("themeTokens.colors.accent")}
              placeholder="#2563eb"
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {errors.themeTokens?.colors?.accent && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.themeTokens.colors.accent.message}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-foreground">
            Background colour
            <input
              {...register("themeTokens.colors.background")}
              placeholder="#0b1020"
              className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {errors.themeTokens?.colors?.background && (
              <span className="mt-1 block text-xs text-red-400" role="alert">
                {errors.themeTokens.colors.background.message}
              </span>
            )}
          </label>

          <div className="flex items-end md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={createWorldMutation.isPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createWorldMutation.isPending ? "Creating…" : "Create World"}
            </button>
          </div>
        </form>

        {createWorldMutation.isError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {errorMessage(createWorldMutation.error, "Could not create the World")}
          </p>
        )}
        {createWorldMutation.isSuccess && (
          <p className="mt-3 text-sm text-emerald-400" role="status">
            Created &quot;{createWorldMutation.data.name}&quot; — it is live at{" "}
            <Link className="underline" href={`/${createWorldMutation.data.slug}`}>
              /{createWorldMutation.data.slug}
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">All Worlds</h2>
          <p className="text-xs text-muted-foreground">
            Deleting a World is permanent and cascades to its products and sections.
          </p>
        </div>

        {worldsQuery.isLoading || !worldsQuery.data ? (
          <p className="text-muted-foreground">Loading worlds…</p>
        ) : worldsQuery.isError ? (
          <p className="text-red-400" role="alert">
            {errorMessage(worldsQuery.error, "Could not load Worlds")}
          </p>
        ) : worldsQuery.data.length === 0 ? (
          <p className="text-muted-foreground">No Worlds yet — create the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pe-4">Name</th>
                  <th className="py-2 pe-4">Slug</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Direction</th>
                  <th className="py-2 pe-4">Locale</th>
                  <th className="py-2 pe-4">Sections</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {worldsQuery.data.map((world) => {
                  const isActive = world.status === "ACTIVE";
                  return (
                    <tr key={world.id} className="border-b border-border/60 align-top">
                      <td className="py-2 pe-4 font-medium text-foreground">{world.name}</td>
                      <td className="py-2 pe-4">
                        <Link className="underline" href={`/${world.slug}`}>
                          /{world.slug}
                        </Link>
                      </td>
                      <td className="py-2 pe-4">{world.status}</td>
                      <td className="py-2 pe-4">{String(world.direction).toLowerCase()}</td>
                      <td className="py-2 pe-4">{world.locale ?? "—"}</td>
                      <td className="py-2 pe-4">
                        {world.sectionCount === 0 ? (
                          <span className="text-muted-foreground">none yet</span>
                        ) : (
                          world.sectionCount
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: world.id,
                                status: isActive ? "INACTIVE" : "ACTIVE",
                              })
                            }
                            className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                          <Link
                            href={`/admin/worlds/${world.id}/sections`}
                            className="rounded-lg border border-border px-2 py-1 text-xs"
                          >
                            Compose (Admin)
                          </Link>
                          <button
                            type="button"
                            disabled={deleteMutation.isPending || pendingDeleteId === world.id}
                            onClick={() => confirmDelete(world.id, world.slug, world.name)}
                            className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
                          >
                            {pendingDeleteId === world.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {statusMutation.isError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {errorMessage(statusMutation.error, "Could not change the World status")}
          </p>
        )}
        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {errorMessage(deleteMutation.error, "Could not delete the World")}
          </p>
        )}
      </section>
    </main>
  );
}
