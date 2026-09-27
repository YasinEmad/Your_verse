"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/api/products";

export default function AdminProductsPage() {
  const [worldId, setWorldId] = useState("demo-world-id");

  const query = useQuery({
    queryKey: ["admin-products", worldId],
    queryFn: () => listProducts(worldId),
    enabled: Boolean(worldId && worldId.trim().length > 0),
    retry: 1,
  });

  const productCount = useMemo(
    () => query.data?.length ?? 0,
    [query.data],
  );

  return (
    <main className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">World ID</label>
        <input
          value={worldId}
          onChange={(event) => setWorldId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
          placeholder="Enter a world ID"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Products</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{productCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Catalog</h2>
        </div>

        {query.isLoading ? (
          <p className="text-slate-500">Loading products…</p>
        ) : query.error ? (
          <p className="text-red-600">Unable to load products for this world.</p>
        ) : query.data && query.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pe-4">Name</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Variants</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pe-4 font-medium text-slate-900">{product.name}</td>
                    <td className="py-2 pe-4">{product.status}</td>
                    <td className="py-2 pe-4">{product.variants.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No products found for this world.</p>
        )}
      </div>
    </main>
  );
}
