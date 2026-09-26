/**
 * Typed user-administration API — frontend-architecture.md §16 / §29.
 *
 * Super-Admin only surface: the user directory and role changes. Both calls
 * are gated by Nest (`@Roles('SUPER_ADMIN')`), so anything reaching this file
 * from a non-SUPER_ADMIN session comes back as a 403 `ApiError` — the frontend
 * never decides who may manage roles, it only renders what the API allows
 * (§13: role data is UX, the guard is the boundary).
 *
 * Shapes mirror the backend's projection exactly: identity + role + timestamps,
 * never carts, orders, or addresses.
 */
import { z } from "zod";
import { apiFetch } from "./client";

export const userRoleSchema = z.enum(["USER", "ADMIN", "SUPER_ADMIN", "SHIPPING"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userListItemSchema = z.object({
  id: z.string().min(1),
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  role: userRoleSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

export const paginatedUsersSchema = z.object({
  items: z.array(userListItemSchema).default([]),
  total: z.number().int().nonnegative().default(0),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
  totalPages: z.number().int().positive().default(1),
});

export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;

/** `GET /api/v1/super-admin/users?page&pageSize` */
export async function listUsers(
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedUsers> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 20)));

  const raw = await apiFetch<unknown>(
    `/api/v1/super-admin/users?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" },
  );

  return paginatedUsersSchema.parse(raw);
}

/**
 * `PATCH /api/v1/super-admin/users/:id/role` — the only mutation on this
 * surface. Returns the updated user so the caller can update its cache from
 * the server's own answer instead of an optimistic guess.
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<UserListItem> {
  const raw = await apiFetch<unknown>(
    `/api/v1/super-admin/users/${encodeURIComponent(userId)}/role`,
    { method: "PATCH", body: JSON.stringify({ role }) },
  );

  return userListItemSchema.parse(raw);
}
