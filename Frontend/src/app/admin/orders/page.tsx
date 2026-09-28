"use client";

import { useOrders } from "@/features/orders";

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading, error } = useOrders();

  return (
    <main className="space-y-6 p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Loading orders…</p>
        ) : error ? (
          <p className="text-red-400">Unable to load orders.</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pe-4">Order</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pe-4 font-medium text-foreground">{order.id}</td>
                    <td className="py-2 pe-4">{order.status}</td>
                    <td className="py-2 pe-4">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
