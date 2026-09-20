"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  signInWithGoogle,
  signInWithGithub,
  signInWithEmail,
  isFirebaseConfigured,
} from "@/lib/auth/firebaseClient";
import { createSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type SignInValues = z.infer<typeof signInSchema>;
type Busy = "google" | "github" | "email" | null;
type BusyButton = "google" | "github";
type Failure = { surface: "firebase" | "session"; message: string } | null;

/**
 * SignInForm - the Phase-2 auth entry (§12/§13). Flow:
 *
 * 1. User clicks Google / GitHub (primary) or submits email+password
 *    (fallback). firebaseClient.ts signs them into Firebase in the browser
 *    (§12, browser-only) and returns the short-lived ID token.
 * 2. We forward that token exactly once via createSession(idToken)
 *    (lib/api/auth.ts, §16 boundary). Nest swaps it for the HttpOnly session
 *    cookie and provisions the User row (§2/§16 Nest side).
 * 3. We discard the ID token immediately - nothing stores it (no state, no
 *    Redux, no TanStack, no localStorage §12/§17). The server owns the cookie.
 *
 * Two failure surfaces are kept distinct so the user can react (§12):
 *   - surface=firebase: the Firebase SDK rejected (bad creds, popup blocked,
 *     env keys unset -> FirebaseConfigError from firebaseConfig.ts).
 *   - surface=session:  the Nest boundary rejected after a successful Firebase
 *     sign-in (network, Nest down, 5xx). Rare; shows a retry affordance.
 */
export function SignInForm() {
  const [busy, setBusy] = useState<Busy>(null);
  const [failure, setFailure] = useState<Failure>(null);
  const firebaseReady = isFirebaseConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  /** Shared tail: forward the ID token once, then drop it (§12/§16). Returns
   *  true only when Nest confirmed the session cookie. */
  const exchange = async (idToken: string): Promise<boolean> => {
    try {
      await createSession(idToken);
      return true;
    } catch (err) {
      setFailure({
        surface: "session",
        message:
          err instanceof ApiError
            ? "Session rejected: " + err.status + " " + err.message
            : "Could not establish the session. Nest unreachable? (§16)",
      });
      return false;
    }
  };

  const onProvider =
    (provider: BusyButton) =>
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (busy !== null) return;
      setBusy(provider);
      setFailure(null);
      try {
        const idToken =
          provider === "google" ? await signInWithGoogle() : await signInWithGithub();
        await exchange(idToken);
      } catch (err) {
        setFailure({
          surface: "firebase",
          message: err instanceof Error ? err.message : "Provider sign-in failed.",
        });
      } finally {
        setBusy(null);
      }
    };

  const onEmailPassword = handleSubmit(async (values: SignInValues) => {
    if (busy !== null) return;
    setBusy("email");
    setFailure(null);
    try {
      const idToken = await signInWithEmail(values.email, values.password);
      await exchange(idToken);
    } catch (err) {
      setFailure({
        surface: "firebase",
        message: err instanceof Error ? err.message : "Email sign-in failed.",
      });
    } finally {
      setBusy(null);
    }
  });

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onProvider("google")}
          disabled={!firebaseReady || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "google" ? "Signing in…" : "Google"}
        </button>
        <button
          type="button"
          onClick={onProvider("github")}
          disabled={!firebaseReady || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "github" ? "Signing in…" : "GitHub"}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
          <span className="bg-card px-2">or</span>
        </div>
      </div>

      <form onSubmit={onEmailPassword} noValidate className="space-y-4">
        <label className="block text-sm font-medium">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {errors.email && (
            <span className="mt-1 block text-xs text-destructive" role="alert">
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {errors.password && (
            <span className="mt-1 block text-xs text-destructive" role="alert">
              {errors.password.message}
            </span>
          )}
        </label>

        {!firebaseReady && (
          <p className="text-xs text-muted-foreground">
            Firebase client keys are not set for this build (§12). Add
            NEXT_PUBLIC_FIREBASE_* to enable Google / GitHub sign-in; the email
            + password path still works once a session endpoint exists (§16).
          </p>
        )}

        {failure && (
          <p
            className="text-xs text-destructive"
            role="alert"
            data-surface={failure.surface}
          >
            {failure.message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "email" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
