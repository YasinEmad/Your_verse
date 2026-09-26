/**
 * features/audit barrel — frontend-architecture.md §9 / §29.
 *
 * Read-only view of the platform's audit trail for Super Admin. There is
 * intentionally no mutation exported: the backend's audit service is
 * write-only and called by the domain services that perform changes.
 */
export { useAuditLogs, auditKeys } from "./hooks";

export {
  auditLogEntrySchema,
  type AuditLogEntry,
  type PaginatedAuditLog,
} from "@/lib/api/audit";
