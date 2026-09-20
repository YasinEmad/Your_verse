/**
 * Typed auth/session API — frontend-architecture.md §12 / §13 / §16.
 *
 * The §12 flow, frontend side:
 *   Browser → Firebase sign-in → short-lived ID token → **once** to
 *   `POST /api/v1/auth/session { idToken }` → backend replies with the session
 *   cookie (HttpOnly). The ID token is then discarded by the caller and never
 *   stored in state, localStorage, Redux, or TanStack Query (Phase-2 rule:
 *   "no ID token in devtools/state after the initial sign-in call").
 *
 * These three functions are the *browser↔Nest session-cookie* boundary. They
 * run whatever shape the backend actually returns through Zod **before** any
 * component sees it (§16 — "backend contract becomes trusted TypeScript
 * type"), and route every request through the single `apiFetch<T>()` wrapper
 * in `lib/api/client.ts` (credentials: "include" so the HttpOnly cookie is
 * sent).
 *
 * Response shapes (§ backend §2 §7 / §16 client):
 * - `POST /api/v1/auth/session { idToken }` → 200/201, empty or `{ ok: true }`
 * - `GET  /api/v1/auth/me`            → `SessionUser | null`
 *   401/403 without a (valid) session → schema returns `null`, **not** an error
 *   — "is there a session?" is expected-line, so the `useSession()` hook sees
 *   `null` (logged-out) rather than throwing on an empty cookie.
 * - `POST /api/v1/auth/logout`        → 204/200, then the mutation clears the
 *   TanStack Query cache (§12: logout clears the query cache).
 */
import { z } from "zod";
import { apiFetch, ApiError } from "./client";

/**
 * `sessionUserSchema` — the User row the backend attaches to a verified session
 * (§ backend §13 "role/permissions data"; § frontend §12 "user display info"
 * plus role/permissions for UX). We tolerate a *subset* of backend fields at
 * the Phase-2 boundary: `permissions` may be absent (backend not running / not
 * wired) and is defaulted to []. Role inherits from backend migration enum.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  firebaseUid: z.string().min(1),
  email: z.string().email().nullable(),
  displayName: z.string().min(1).nullable(),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN", "SHIPPING"]),
  permissions: z.array(z.string()).default([]),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

const sessionUserOrNullSchema = z
  .union([sessionUserSchema, z.literal(null)])
  .default(null);

/**
 * `signInWithFirebase` creates the HttpOnly session by forwarding the
 * short-lived Firebase ID token to `POST /api/v1/auth/session`. The caller
 * (SignInForm) obtained that token **once** from `lib/auth/firebaseClient.ts`;
 * this function returns it to nothing — it stays local to the form handler and
 * falls out of scope immediately after the call. The cookie is what persists.
 */
export async function createSession(idToken: string): Promise<void> {
  await apiFetch<void>("/api/v1/auth/session", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

/**
 * `getMe` — `GET /api/v1/auth/me`. Returns the logged-in `SessionUser`, or
 * `null` when there is no (valid) session. A 401 here is *normal operation* —
 * the cookie is simply absent/expired — so it is mapped to `null` instead of
 * being thrown, which is what lets `useSession()` report `{ user: null }`
 * without treating "logged out" as an error state (§13 UX principle).
 */
export async function getMe(): Promise<SessionUser | null> {
  try {
    const raw = await apiFetch<unknown>("/api/v1/auth/me");
    return sessionUserOrNullSchema.parse(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * `logout` — clears the server-side session cookie via
 * `POST /api/v1/auth/logout` (cookie revoked + Firebase session revoked
 * server-side, § backend §12). A missing session (401) is a no-op: already
 * logged out. The `useLogout()` mutation additionally clears the frontend
 * query cache so cached `/auth/me`/session data is dropped immediately.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return;
    }
    throw error;
  }
}