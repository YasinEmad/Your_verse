/**
 * features/users barrel — frontend-architecture.md §9 / §29.
 *
 * Super Admin's global role administration. Shared with Admin-facing code only
 * where permissions overlap; nothing here widens what the API will accept.
 */
export { useUsers, useUpdateUserRole, usersKeys } from "./hooks";

export {
  userRoleSchema,
  userListItemSchema,
  type PaginatedUsers,
  type UserListItem,
  type UserRole,
} from "@/lib/api/users";
