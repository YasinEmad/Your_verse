"use client";

/**
 * `/shipping` route-group gate — frontend-architecture.md §30, Phase 10.
 *
 * Admitted: a `SHIPPING`-role user, or anyone holding `shipping.read` (which is
 * how an `ADMIN` with the shipping permission, and a `SUPER_ADMIN` via the `*`
 * wildcard, get in).
 *
 * UX ONLY, exactly as in `/admin` and `/super-admin`. The real boundary is the
 * `shipping.read` / `shipping.update` permissions on the Nest endpoints, which
 * reject a USER session with a 403 no matter what this component believes.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogout, usePermission, useSession } from "@/features/auth";

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSession();
  const canReadShipments = usePermission("shipping.read");
  const logout = useLogout();

  const isShippingRole = user?.role === "SHIPPING";
  const isAllowed = isShippingRole || canReadShipments;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAllowed) {
      router.replace("/");
    }
  }, [isAllowed, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="p-8 text-slate-500">Checking shipping access…</div>;
  }

  if (!user || !isAuthenticated || !isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Shipping
            </p>
            <p className="text-sm text-slate-600">
              {user.email ?? user.displayName ?? user.id} · {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace("/") })}
            disabled={logout.isPending}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
