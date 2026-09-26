/**
 * TanStack Query auth hooks — frontend-architecture.md §13 / §24.
 *
 * `useSession()` — the one authoritative "who am I" source in the app. A
 * `useQuery` that calls `getMe()` (lib/api/auth.ts) with
 * `queryKey: ["auth", "session"]`. `getMe()` maps a 401 to `null` *before* the
 * hook layer, so logged-out is a normal value — never a thrown error — and
 * `isAuthenticated` is just `user !== null`.
 *
 * `useLogout()` — a `useMutation` that (1) tells the backend to revoke the
 * session cookie via `logout()` (lib/api/auth.ts), then (2) clears the whole
 * TanStack cache. Clearing the cache is the important part: every
 * permissions/session read downstream re-runs `getMe()` and lands
 * unauthenticated, instead of serving a stale cached session (§13 "Logout
 * clears the query cache").
 *
 * These hooks are the *frontend* UX truth (hide nav, redirect away from /admin)
 * but are *not* the security boundary — §13: every API guard re-checks the
 * backend cookie independently; `usePermission()` here just returns booleans
 * for conditional rendering.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMe, logout, type SessionUser } from "@/lib/api/auth";

const SESSION_KEY = ["auth", "session"] as const;

export interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useSession(): SessionState {
  const {
    data: user,
    isLoading,
    isFetching,
  } = useQuery<SessionUser | null>({
    queryKey: SESSION_KEY,
    queryFn: getMe,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    user: user ?? null,
    isAuthenticated: user !== undefined && user !== null,
    isLoading: isLoading || isFetching,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logout();
      queryClient.clear();
    },
  });
}

/**
 * `usePermission(permission)` — §13's conditional-rendering helper, reading the
 * already-cached session rather than issuing another request. Returns `false`
 * while the session is still loading so a gated surface never flashes its
 * contents before the answer arrives.
 *
 * The matrix arrives from `/auth/me` (backend-architecture.md §6) and a
 * SUPER_ADMIN carries the literal `"*"` wildcard, which is treated as "every
 * permission" — the same semantics `PermissionsGuard` gives it server-side.
 *
 * UX ONLY. A `true` here means "don't hide this button"; it grants nothing.
 * Every mutation still round-trips to a Nest guard that re-derives the answer
 * from the session cookie.
 */
export function usePermission(permission: string): boolean {
  const { user, isLoading } = useSession();

  if (isLoading || !user) return false;

  return user.permissions.includes("*") || user.permissions.includes(permission);
}
