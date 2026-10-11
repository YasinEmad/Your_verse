"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrder } from "@/features/orders";
import { formatPrice } from "@/components/store/helpers";

const STATUS_COPY: Record<string, string> = {
  PROCESSING: "We received your order — cash on delivery, you pay the courier when it arrives.",
  PENDING: "Cash on delivery — you pay the courier when it arrives.",
  PAID: "Paid in cash on delivery.",
  CANCELLED: "Cancelled. Any reserved stock was returned.",
  FULFILLED: "Completed.",
  REFUNDED: "Refunded.",
};

export default function OrderDetailPage() {
  const params = useParams<{ worldSlug: string; orderId: string }>();
  const worldSlug = params.worldSlug;

  const { data: order, isLoading, error } = useOrder(params.orderId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8">
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      ) : error || !order ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            {error ? error.message : "Order not found."}
          </p>
          <Link
            href={`/${worldSlug}/orders`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            View your orders
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              Order placed
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Thank you{order.recipientName ? `, ${order.recipientName}` : ""}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {STATUS_COPY[order.status] ?? STATUS_COPY.PROCESSING}
            </p>
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              Order {order.id}
            </p>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Items</h2>
            <ul className="mt-4 space-y-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {item.variant?.sku ?? item.variantId}
                    <span className="ms-2 text-xs text-muted-foreground/70">
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatPrice(item.unitPrice * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="text-foreground">{formatPrice(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="text-foreground">At the door (COD)</dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="font-semibold text-foreground">Total</dt>
                <dd className="font-semibold text-foreground">
                  {formatPrice(order.total, order.currency)}
                </dd>
              </div>
            </dl>
          </section>

          {order.recipientName || order.recipientPhone || order.shippingAddress ? (
            <section className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Delivery details</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {order.recipientName ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Recipient</dt>
                    <dd className="text-end text-foreground">{order.recipientName}</dd>
                  </div>
                ) : null}
                {order.recipientPhone ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="text-end text-foreground">{order.recipientPhone}</dd>
                  </div>
                ) : null}
                {order.shippingAddress ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="max-w-[70%] text-end text-foreground">
                      {[
                        order.shippingAddress.line1,
                        order.shippingAddress.line2,
                        order.shippingAddress.city,
                        order.shippingAddress.region,
                        order.shippingAddress.postalCode,
                        order.shippingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {order.shipment?.trackingNumber ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Tracking: {order.shipment.carrier} {order.shipment.trackingNumber}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href={`/${worldSlug}/orders`}
              className="rounded-lg border border-border px-4 py-2 text-foreground hover:border-ring"
            >
              View all orders
            </Link>
            <Link
              href={`/${worldSlug}/products`}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Keep shopping
            </Link>
          </div>
        </>
      )}
    </main>
  );
}