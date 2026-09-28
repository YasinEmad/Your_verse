/**
 * NavbarAuthSlot — the *only* `"use client"` part of the Navbar.
 *
 * frontend-architecture.md §10: the Navbar itself is a Server Component, but
 * "am I signed in, and as whom" is client state — the session cookie is HttpOnly
 * and is only observable through `getMe()` (lib/api/auth.ts). So the split is
 * deliberately lopsided: the Navbar server-renders the wordmark, the World
 * switcher and the cart affordance, and hands just this one slot to the client.
 *
 * Auth state is read from `useSession()` (features/auth, F2) — the app's single
 * authoritative "who am I" source, itself a `["auth", "session"]` query against
 * `/auth/me`. There is no `user !== undefined` guess or hardcoded default here:
 * `isLoading` renders a neutral placeholder so the navbar does not flash
 * "Sign in" at an already-signed-in user, and both branches are decided by the
 * real session response.
 *
 * §13: this is UX only. Rendering someone's display name grants nothing — the
 * NestJS guards re-derive every answer from the cookie independently.
 */
"use client";

import Link from "next/link";
import { useSession, useLogout } from "@/features/auth";

export function NavbarAuthSlot() {
  const { user, isAuthenticated, isLoading } = useSession();
  const logout = useLogout();

  // Neither branch is the truth yet. Rendering anything here would be a guess,
  // and a wrong guess here is a visible one (a "Sign in" link for a signed-in
  // user invites a pointless round trip through Firebase).
  if (isLoading) {
    return (
      <div
        className="h-8 w-24 animate-pulse rounded-md bg-muted"
        aria-hidden="true"
        data-testid="navbar-auth-loading"
      />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Sign in
      </Link>
    );
  }

  // `displayName` is nullable on the session payload and `email` is nullable
  // too, so the fallback chain is a real question about the data, not a stub.
  const label = user.displayName ?? user.email ?? "Account";

  return (
    <div className="flex items-center gap-2">
      <span
        className="max-w-[12rem] truncate text-sm text-muted-foreground"
        title={label}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
      >
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
