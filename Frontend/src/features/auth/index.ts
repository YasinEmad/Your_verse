/**
 * features/auth barrel — frontend-architecture.md §4 / §13.
 *
 * Re-exports the public surface of the auth feature so the rest of the app
 * consumes it through one stable path (`@/features/auth`), never reaching into
 * internals:
 *
 *   - `useSession()` / `useLogout()`  — TanStack Query hooks (§13, hooks.ts)
 *   - `SessionState` / `SignInForm`  — the query state shape, and the §12
 *     boundary form (components/SignInForm.tsx)
 *
 * The Chrome/Next boundary note (§16): `frontendClient.ts` and its siblings
 * are browser-only; nothing re-exported from here pulls server code.
 */
export {
  useSession,
  useLogout,
  type SessionState,
} from "./hooks";

export { SignInForm } from "./components/SignInForm";
