"use client";

/**
 * `/super-admin/audit-log` — read-only view of the platform audit trail
 * (Phase 9, frontend-architecture.md §29).
 *
 * Strictly read-only: no create/update/delete control exists here, and none can
 * be added without a backend endpoint, because the audit service is write-only
 * and called by whichever domain service performed the change (B9). Rows are
 * rendered newest-first exactly as the API returns them.
 *
 * Pagination is page-in-query-key (`["audit-log", { page, pageSize }]`), so
 * paging is a cache read rather than a mutation of shared view state.
 */
import { useState } from "react";
import { useAuditLogs } from "@/features/audit";
import { ApiError } from "@/lib/api/client";

const PAGE_SIZE = 25;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = Array.isArray(error.message) ? error.message.join(" ") : error.message;
    return `${fallback} (${error.status}) ${detail}`.trim();
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().replace("T", " ").slice(0, 19);
}

function formatMetadata(metadata: unknown): string {
  if (metadata === null || metadata === undefined) return "—";
  if (typeof metadata === "string") return metadata;
  try {
    return JSON.stringify(metadata);
  } catch {
    return "[unserializable]";
  }
}

export default function SuperAdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const query = useAuditLogs(page, PAGE_SIZE);
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <main className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Read-only record of privileged mutations across Worlds, orders, shipping and roles.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {query.isLoading || !query.data ? (
          <p className="text-muted-foreground">Loading audit entries…</p>
        ) : query.isError ? (
          <p className="text-red-400" role="alert">
            {errorMessage(query.error, "Could not load the audit log")}
          </p>
        ) : query.data.items.length === 0 ? (
          <p className="text-muted-foreground">No audit entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pe-4">When</th>
                  <th className="py-2 pe-4">Action</th>
                  <th className="py-2 pe-4">Entity</th>
                  <th className="py-2 pe-4">Actor</th>
                  <th className="py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 align-top">
                    <td className="whitespace-nowrap py-2 pe-4 text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="py-2 pe-4 font-medium text-foreground">{entry.action}</td>
                    <td className="py-2 pe-4">
                      {entry.entityType}
                      {entry.entityId ? (
                        <span className="ms-1 text-xs text-muted-foreground">#{entry.entityId}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pe-4">
                      {entry.actor?.email ?? entry.actor?.id ?? entry.actorUserId ?? "system"}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {formatMetadata(entry.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            Page {query.data?.page ?? page} of {totalPages} · {query.data?.total ?? 0} entries
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || query.isFetching}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || query.isFetching}
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
