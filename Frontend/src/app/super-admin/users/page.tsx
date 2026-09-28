"use client";

/**
 * `/super-admin/users` — global role administration (Phase 9,
 * frontend-architecture.md §29).
 *
 * The role `<select>` is bound directly to the backend's role-update endpoint
 * (`PATCH /api/v1/super-admin/users/:id/role`) — there is no local "pending
 * role" state to drift out of sync: the table shows whatever the server last
 * confirmed, refetched by query invalidation after each change.
 *
 * Two deliberate omissions:
 *  - No self-role control. The backend refuses to let a Super Admin change
 *    their own role (that would leave the platform with no way back in), so
 *    offering the control would only ever produce a 403.
 *  - No user creation or deletion. Provisioning is JIT on first Firebase
 *    sign-in and account deletion is out of scope for this phase; role is the
 *    only lever Super Admin pulls here.
 */
import { useState } from "react";
import { useSession } from "@/features/auth";
import {
  useUpdateUserRole,
  useUsers,
  userRoleSchema,
  type UserRole,
} from "@/features/users";
import { ApiError } from "@/lib/api/client";

const PAGE_SIZE = 20;
const ROLES = userRoleSchema.options;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = Array.isArray(error.message) ? error.message.join(" ") : error.message;
    return `${fallback} (${error.status}) ${detail}`.trim();
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function SuperAdminUsersPage() {
  const { user: sessionUser } = useSession();
  const [page, setPage] = useState(1);
  const usersQuery = useUsers(page, PAGE_SIZE);
  const roleMutation = useUpdateUserRole();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const changeRole = async (userId: string, role: UserRole) => {
    setPendingUserId(userId);
    setFailure(null);
    try {
      await roleMutation.mutateAsync({ userId, role });
    } catch (error) {
      // The select is a controlled input bound to server data, so a rejected
      // change re-renders back to the confirmed role on the next refetch —
      // surface the reason rather than silently snapping back.
      setFailure(errorMessage(error, "Could not change the role"));
    } finally {
      setPendingUserId(null);
    }
  };

  const totalPages = usersQuery.data?.totalPages ?? 1;

  return (
    <main className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Role changes take effect on the user&apos;s next request; every change is written to
          the audit log.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {usersQuery.isLoading || !usersQuery.data ? (
          <p className="text-muted-foreground">Loading users…</p>
        ) : usersQuery.isError ? (
          <p className="text-red-400" role="alert">
            {errorMessage(usersQuery.error, "Could not load users")}
          </p>
        ) : usersQuery.data.items.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pe-4">User</th>
                  <th className="py-2 pe-4">Email</th>
                  <th className="py-2 pe-4">Role</th>
                  <th className="py-2">Change role</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.items.map((row) => {
                  const isSelf = row.id === sessionUser?.id;
                  return (
                    <tr key={row.id} className="border-b border-border/60 align-top">
                      <td className="py-2 pe-4 font-medium text-foreground">
                        {row.displayName ?? "—"}
                        {isSelf && <span className="ms-2 text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="py-2 pe-4">{row.email ?? "—"}</td>
                      <td className="py-2 pe-4">{row.role}</td>
                      <td className="py-2">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">
                            You cannot change your own role
                          </span>
                        ) : (
                          <select
                            aria-label={`Role for ${row.email ?? row.id}`}
                            value={row.role}
                            disabled={pendingUserId === row.id}
                            onChange={(event) => {
                              const next = event.target.value;
                              if (userRoleSchema.safeParse(next).success) {
                                void changeRole(row.id, next as UserRole);
                              }
                            }}
                            className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-sm outline-none focus:border-ring disabled:opacity-50"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {failure && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {failure}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            Page {usersQuery.data?.page ?? page} of {totalPages} ·{" "}
            {usersQuery.data?.total ?? 0} users
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || usersQuery.isFetching}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || usersQuery.isFetching}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
