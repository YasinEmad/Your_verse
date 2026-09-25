"use client";

import React from "react";
import { useOrders, useCreateOrder, usePayOrder } from "@/features/orders";

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const create = useCreateOrder();
  const pay = usePayOrder();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Orders</h1>

      <div className="mb-4">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={() => create.mutate()}
          disabled={create.status === "pending"}
        >
          Create Order From Cart
        </button>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Failed to load orders.</p>}

      <div className="space-y-4">
        {orders?.map((o) => (
          <div key={o.id} className="p-4 border rounded">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Order {o.id}</div>
                <div className="text-sm text-muted-foreground">Status: {o.status}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{o.currency} {o.total}</div>
                {o.status === "PENDING" && (
                  <button
                    className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
                    onClick={() => pay.mutate({ id: o.id, amount: o.total })}
                    disabled={pay.status === "pending"}
                  >
                    Pay
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 text-sm">
              <strong>Items:</strong>
              <ul className="list-disc ml-6">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.variantId} × {it.quantity} @ {o.currency} {it.unitPrice}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
