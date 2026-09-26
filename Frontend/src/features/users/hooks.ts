/**
 * User role-management hooks — frontend-architecture.md §29.
 *
 * `useUsers(page)` reads the Super-Admin directory; `useUpdateUserRole()`
 * mutates one user's role and then invalidates the list so the table shows the
 * server's answer. Query keys are namespaced `["users", { page }]` (§11) —
 * separate from `["auth", "session"]`, which is *my own* session, so a role
 * change made to someone else never silently rewrites the caller's own identity
 * (their `/auth/me` refetch picks it up on its own).
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  updateUserRole,
  type PaginatedUsers,
  type UserRole,
} from "@/lib/api/users";

export const usersKeys = {
  list: (page: number, pageSize: number) => ["users", { page, pageSize }] as const,
};

export function useUsers(page = 1, pageSize = 20) {
  return useQuery<PaginatedUsers>({
    queryKey: usersKeys.list(page, pageSize),
    queryFn: () => listUsers({ page, pageSize }),
    retry: 1,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof updateUserRole>>,
    Error,
    { userId: string; role: UserRole }
  >({
    mutationFn: ({ userId, role }) => updateUserRole(userId, role),
    onSuccess: async (_user, { userId }) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      // If the change was to the caller's *own* row, the cached session is now
      // stale — re-read `/auth/me` so the UI's role-dependent rendering follows
      // the server rather than the pre-mutation cache.
      const session = queryClient.getQueryData<{ id: string } | null>([
        "auth",
        "session",
      ]);
      if (session?.id === userId) {
        await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      }
    },
  });
}
