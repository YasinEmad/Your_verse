/**
 * `/login` — the sign-in surface the global Navbar's auth slot links to.
 *
 * F2 built the whole §12 flow (`SignInForm`: Firebase sign-in → one
 * `POST /auth/session` ID-token exchange → HttpOnly cookie) and exported it from
 * `@/features/auth`, but nothing mounted it, so the Navbar's "Sign in" link
 * would have pointed at a 404. This page is that mount point and nothing more:
 * it adds no auth logic, no new call and no new state of its own.
 *
 * A Server Component, since none of this is dynamic — only the form inside is
 * interactive, and `SignInForm` is already a Client Component (§10).
 */
import { SignInForm } from "@/features/auth";

export const metadata = {
  title: "Sign in — Yourverse",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 md:px-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use the same account to reach your orders and any staff dashboard.
        </p>
      </div>
      <SignInForm />
    </main>
  );
}
