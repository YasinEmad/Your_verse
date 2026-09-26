/**
 * Super-Admin World *identity* hooks — frontend-architecture.md §29 / Phase 9.
 *
 * These are deliberately a different feature surface from Admin's
 * section-composition hooks: the permission split is real, not cosmetic
 * (backend-architecture.md §6/§26). Super Admin owns a World's identity —
 * create, delete, activate/deactivate — while Admin owns what's *on* the page
 * (`world_sections`). Nothing in this file reads or writes a section, and
 * nothing in the Admin section editor calls these, so neither side can quietly
 * grow into the other's permission.
 *
 * Query keys (§11/§24): the identity list is keyed `["worlds", "identity"]` —
 * namespaced away from the storefront's `["world", slug]`, because a World row
 * and a *rendered* World page are different server state with different
 * lifetimes. Mutations invalidate the identity list plus the affected
 * `["world", slug]` so a server-rendered storefront page refetches.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorld,
  deleteWorld,
  listWorlds,
  updateWorldStatus,
  type CreateWorldInput,
  type WorldSummary,
} from "@/lib/api/worlds";

export const worldsKeys = {
  identity: ["worlds", "identity"] as const,
  store: (slug: string) => ["world", slug] as const,
};

export function useWorlds() {
  return useQuery<WorldSummary[]>({
    queryKey: worldsKeys.identity,
    queryFn: listWorlds,
    retry: 1,
  });
}

export function useCreateWorld() {
  const queryClient = useQueryClient();

  return useMutation<WorldSummary, Error, CreateWorldInput>({
    mutationFn: (input) => createWorld(input),
    onSuccess: async (world) => {
      await queryClient.invalidateQueries({ queryKey: worldsKeys.identity });
      // A brand-new World resolves at /<slug> immediately (default registry
      // layout, zero sections) — drop any cached 404 for it.
      await queryClient.invalidateQueries({ queryKey: worldsKeys.store(world.slug) });
    },
  });
}

export function useUpdateWorldStatus() {
  const queryClient = useQueryClient();

  return useMutation<WorldSummary, Error, { id: string; status: "ACTIVE" | "INACTIVE" }>({
    mutationFn: ({ id, status }) => updateWorldStatus(id, status),
    onSuccess: async (world) => {
      await queryClient.invalidateQueries({ queryKey: worldsKeys.identity });
      await queryClient.invalidateQueries({ queryKey: worldsKeys.store(world.slug) });
    },
  });
}

export function useDeleteWorld() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; slug: string }>({
    mutationFn: ({ id }) => deleteWorld(id),
    onSuccess: async (_result, { slug }) => {
      await queryClient.invalidateQueries({ queryKey: worldsKeys.identity });
      await queryClient.invalidateQueries({ queryKey: worldsKeys.store(slug) });
    },
  });
}
