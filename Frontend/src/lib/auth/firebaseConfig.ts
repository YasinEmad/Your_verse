/**
 * Firebase client-request config — frontend-architecture.md §12 / §13 / §16.
 *
 * The single source of truth for the `NEXT_PUBLIC_FIREBASE_*` variable names
 * and the small error type they share:
 *
 * - `FirebaseConfigError` — thrown by `firebaseClient.ts` when a sign-in is
 *   actually attempted with an incomplete/absent env config, and by nothing on
 *   module load (browser-boundary lazy-init rule, §12).
 * - `FIREBASE_ENV_KEYS` — the exact key set that both `firebaseClient.ts`
 *   (`readEnvConfig`) and the Phase-3 `lib/api/auth.ts` Zod schema validate.
 *
 * This module has no Firebase SDK import and no browser globals, so it is safe
 * to import from either side of the server/client boundary.
 */
export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

/** Every required Firebase web-app config env key (§12). `firebaseClient.ts`
 * reads exactly this set via `readEnvConfig`; `lib/api/auth.ts` mirrors it at
 * the API boundary in Phase 3. */
export const FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type FirebaseEnvKey = (typeof FIREBASE_ENV_KEYS)[number];

export interface FirebaseClientConfigRecord {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
