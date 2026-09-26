/**
 * Typed audit-log API — frontend-architecture.md §16 / §29.
 *
 * Read-only by design: the audit trail is written by whichever domain service
 * performed a mutation (B9), and this surface only ever *reads* it. There is no
 * create/update/delete here, matching the backend's write-only-service rule.
 *
 * Endpoint is `GET /api/v1/admin/audit-log` (permission `super_admin.audit.read`,
 * which only SUPER_ADMIN holds) — the URL prefix is historical from B9; the
 * permission, not the path, is what keeps it Super-Admin-only.
 */
import { z } from "zod";
import { apiFetch } from "./client";
import { userRoleSchema } from "./users";

export const auditLogEntrySchema = z.object({
  id: z.string().min(1),
  actorUserId: z.string().nullable().optional(),
  actor: z
    .object({
      id: z.string().min(1),
      email: z.string().nullable().optional(),
      role: userRoleSchema,
    })
    .nullable()
    .optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().default(""),
  metadata: z.unknown().default({}),
  createdAt: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const paginatedAuditLogSchema = z.object({
  items: z.array(auditLogEntrySchema).default([]),
  total: z.number().int().nonnegative().default(0),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(50),
  totalPages: z.number().int().positive().default(1),
});

export type PaginatedAuditLog = z.infer<typeof paginatedAuditLogSchema>;

/** `GET /api/v1/admin/audit-log?page&pageSize` */
export async function listAuditLogs(
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedAuditLog> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 50)));

  const raw = await apiFetch<unknown>(
    `/api/v1/admin/audit-log?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" },
  );

  return paginatedAuditLogSchema.parse(raw);
}
