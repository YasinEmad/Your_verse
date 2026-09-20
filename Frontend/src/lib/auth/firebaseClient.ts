/**
 * Firebase client SDK ("app auth") — frontend-architecture.md §12 / §13.
 *
 * Client-only module: it imports the Firebase **web** SDK which touches browser
 * globals, so nothing here may ever be imported by a Server Component or module
 * that runs on the server. Treat this file as a browser-boundary module:
 * - *Lazy init* — `getFirebaseAuth()` runs on first call, never at import time,
 *   so an unset/partial env config can't crash SSR or a cold build (Phase-2
 *   rule: the backend and env may not be fully wired yet).
 * - *Env-gated* — throws a descriptive error only when a sign-in is actually
 *   attempted without complete config, never on module load.
 *
 * What this module does NOT do: store, persist, or cache the Firebase ID token.
 * Each sign-in helper returns the short-lived ID token to the caller, which
 * forwards it **once** to `POST /api/v1/auth/session` (via `lib/api/auth.ts`)
 * and then lets it fall out of scope — per §12, the token is never kept in
 * state, localStorage, Redux, or TanStack Query.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  type Auth,
} from "firebase/auth";
import { FirebaseConfigError } from "./firebaseConfig";

/**
 * Formal Firebase web-app config contract (§12 init). Reads the same
 * `NEXT_PUBLIC_FIREBASE_*` keys that `lib/api/auth.ts` Zod schema validates at
 * the backend boundary — one source of truth for the variable names.
 */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readEnvConfig(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

const EMPTY_PROJECT_ID = "yourverse";

/** True when every required field is populated. `isFirebaseConfigured()` is
 * exposed so the SignIn page can render a "not configured yet" message instead
 * of crashing — firebase is not a hard Phase-2 dependency. */
export function isFirebaseConfigured(): boolean {
  const cfg = readEnvConfig();
  return Object.values(cfg).every((v) => v.length > 0);
}

function getAppConfig(): FirebaseClientConfig {
  const cfg = readEnvConfig();
  if (!Object.values(cfg).every((v) => v.length > 0)) {
    throw new FirebaseConfigError(
      "Firebase client SDK is not configured: set NEXT_PUBLIC_FIREBASE_API_KEY, " +
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, " +
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, " +
        "and NEXT_PUBLIC_FIREBASE_APP_ID (frontend-architecture.md §12). " +
        "Expected a project id like: " + EMPTY_PROJECT_ID,
    );
  }
  return cfg;
}

function getFirebaseApp(): FirebaseApp {
  // Already-initialized app wins (matters in HMR / repeated client mounts);
  // otherwise create one lazily from env. Never at import time.
  if (!getApps().length) {
    return initializeApp(getAppConfig());
  }
  return getApp();
}

function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new FirebaseConfigError(
      "firebaseClient.ts is browser-only (firebase/auth imports browser globals). " +
        "It must only be called from a Client Component (§4 server/client rule).",
    );
  }
  return getAuth(getFirebaseApp());
}

/** Returns the short-lived ID token for the just-signed-in user. The caller
 * forwards it once to `POST /api/v1/auth/session` then discards it (§12). */
export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return await credential.user.getIdToken();
}

export async function signInWithGithub(): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GithubAuthProvider());
  return await credential.user.getIdToken();
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return await credential.user.getIdToken();
}

/** Firebase-side sign-out only; the session *cookie* is cleared by the
 * `logout()` API call (`/api/v1/auth/logout`), which the useLogout mutation
 * performs first (§12 — server owns revocation). */
export async function signOutFirebase(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  // best-effort: no-op if firebase was never configured (native login may not
  // be in use), matching the "not configured" build-tolerance of this phase.
  if (!isFirebaseConfigured()) {
    return;
  }
  await firebaseSignOut(getFirebaseAuth());
}
