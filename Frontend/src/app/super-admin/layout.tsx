"use client";

/**
 * Super Admin route-group gate + shell — frontend-architecture.md §29, Phase 9.
 *
 * UX ONLY. `useSession()` tells us who the caller believes they are so we can
 * avoid rendering a dashboard they cannot use; it is *not* the security
 * boundary. Every read and write behind these pages is independently gated by
 * Nest (`@Roles('SUPER_ADMIN')`), so bypassing this layout — typed URL, curl,
 * or a hand-rolled fetch — still gets a 403 from the API. The redirect below
 * exists to save a wasted round trip, not to keep anyone out.
 */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLogout, useSession } from "@/features/auth";

const NAV_ITEMS = [
  { href: "/super-admin/worlds", label: "Worlds" },
  { href: "/super-admin/users", label: "Users" },
  { href: "/super-admin/audit-log", label: "Audit log" },
] as const;

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useSession();
  const logout = useLogout();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isSuperAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isSuperAdmin, router]);

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Checking super admin access…</div>;
  }

  if (!isAuthenticated || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Super Admin
            </p>
            <p className="text-sm text-muted-foreground">
              {user.email ?? user.displayName ?? user.id}
            </p>
          </div>

          <nav className="flex items-center gap-2" aria-label="Super admin sections">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace("/") })}
              disabled={logout.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
