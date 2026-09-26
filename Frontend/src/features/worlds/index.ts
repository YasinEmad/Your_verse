/**
 * features/worlds barrel — frontend-architecture.md §9 / §29.
 *
 * The identity surface Super Admin uses for World lifecycle. Admin's
 * section-composition hooks are intentionally *not* re-exported here: the two
 * permission domains stay separately importable so a page's imports state which
 * one it is exercising.
 */
export {
  useWorlds,
  useCreateWorld,
  useUpdateWorldStatus,
  useDeleteWorld,
  worldsKeys,
} from "./hooks";

export {
  createWorldInputSchema,
  worldSummarySchema,
  type CreateWorldInput,
  type WorldSummary,
} from "@/lib/api/worlds";
