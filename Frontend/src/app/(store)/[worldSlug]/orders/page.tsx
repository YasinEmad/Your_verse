"use client";

import React, { useRef } from "react";
import { useOrders, useCreateOrder } from "@/features/orders";

const PAYMENT_COPY: Record<string, string> = {
  PROCESSING: "Cash on delivery — pay the courier when it arrives.",
  PENDING: "Cash on delivery — pay the courier when it arrives.",
  PAID: "Paid in cash on delivery.",
  CANCELLED: "Cancelled. Any reserved stock was returned.",
  FULFILLED: "Completed.",
  REFUNDED: "Refunded.",
};

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const create = useCreateOrder();
  // One key per checkout *intent*, not per click: a double click, or a retry
  // after a response that never arrived, must reach the backend as the same
  // request rather than as two orders. Cleared only once an order really exists.
  const checkoutKey = useRef<string | null>(null);

  const placeOrder = () => {
    checkoutKey.current ??= crypto.randomUUID();
    create.mutate(
      { idempotencyKey: checkoutKey.current },
      { onSuccess: () => { checkoutKey.current = null; } },
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Orders</h1>

      <div className="mb-4">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={placeOrder}
          disabled={create.status === "pending"}
        >
          Place Order From Cart
        </button>
        <p className="mt-2 text-sm text-muted-foreground">
          Cash on delivery. Nothing is charged now — you pay the courier when the parcel arrives.
        </p>
        {create.error && (
          <p className="mt-2 text-sm text-red-600">{create.error.message}</p>
        )}
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
                <div className="text-sm text-muted-foreground">
                  {PAYMENT_COPY[o.status] ?? ""}
                </div>
                {o.shipment?.trackingNumber && (
                  <div className="text-sm text-muted-foreground">
                    Tracking: {o.shipment.carrier} {o.shipment.trackingNumber}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">{o.currency} {o.total.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <strong>Items:</strong>
              <ul className="list-disc ms-6">
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
