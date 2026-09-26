/**
 * Audit-log reading hook — frontend-architecture.md §29.
 *
 * One query, one key per page. Pagination state lives in the page component
 * (ephemeral view state, §11) and is passed in as an argument, so the key fully
 * describes the request and a page change is just another cache entry rather
 * than a mutation of a shared object. Nothing in this feature can write.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { listAuditLogs, type PaginatedAuditLog } from "@/lib/api/audit";

export const auditKeys = {
  list: (page: number, pageSize: number) => ["audit-log", { page, pageSize }] as const,
};

export function useAuditLogs(page = 1, pageSize = 25) {
  return useQuery<PaginatedAuditLog>({
    queryKey: auditKeys.list(page, pageSize),
    queryFn: () => listAuditLogs({ page, pageSize }),
    retry: 1,
  });
}
