"use client";

import { useOrders } from "@/features/orders";

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading, error } = useOrders();

  return (
    <main className="space-y-6 p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-slate-500">Loading orders…</p>
        ) : error ? (
          <p className="text-red-600">Unable to load orders.</p>
        ) : orders.length === 0 ? (
          <p className="text-slate-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pe-4">Order</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pe-4 font-medium text-slate-900">{order.id}</td>
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
