"use client";

/**
 * `/shipping/shipments` — the shipping desk (Phase 10,
 * frontend-architecture.md §30).
 *
 * Two halves of one table:
 *   - read-only order context: which order, its state, how many items are in
 *     the box, when it was placed. Read-only on purpose — changing an order is
 *     not this surface's job.
 *   - the shipment itself, editable: carrier, tracking number and status.
 *
 * On PII: this page never asks for a product or a user. The only customer data
 * it can possibly render is the destination captured on the order (name, phone,
 * address lines) — the three fields a shipping label physically needs. There is
 * no email, no role, no user id, no price, no product row in the response, and
 * none can appear here, so "minimize PII" is a property of the payload rather
 * than a promise about the markup.
 *
 * Authorization is enforced by the backend (`shipping.read` to list,
 * `shipping.update` to write); `/shipping/layout.tsx` only decides what to
 * render for whom.
 */
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  shipmentStatusOptions,
  useShipments,
  useUpdateShipment,
  type Shipment,
  type ShipmentStatus,
} from "@/features/shipping";

/**
 * Badges are a translucent tint of their own hue with a light foreground: a
 * solid `-100` fill only reads on a light canvas, and a `-800` foreground is
 * unreadable on black.
 */
const STATUS_STYLES: Record<ShipmentStatus, string> = {
  ORDERED: "bg-muted text-foreground",
  PROCESSING: "bg-amber-500/15 text-amber-300",
  SHIPPED: "bg-sky-500/15 text-sky-300",
  OUT_FOR_DELIVERY: "bg-violet-500/15 text-violet-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-300",
  CANCELLED: "bg-destructive/15 text-red-400",
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = Array.isArray(error.message)
      ? error.message.join(" ")
      : error.message;
    return `${fallback} (${error.status}) ${detail}`.trim();
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

/** The label destination, exactly as the order carries it — nothing else. */
function Destination({ shipment }: { shipment: Shipment }) {
  const { order } = shipment;
  const address = order.shippingAddress ?? null;
  const lines = address
    ? [
        address.line1,
        address.line2,
        [address.city, address.state].filter(Boolean).join(", ") || undefined,
        address.postalCode,
        address.country,
      ].filter((line): line is string => Boolean(line))
    : [];

  const hasDestination = Boolean(order.recipientName || order.recipientPhone || lines.length);

  if (!hasDestination) {
    return (
      <p className="text-sm text-amber-400">
        No destination on this order — it predates checkout capturing an address.
      </p>
    );
  }

  return (
    <div className="text-sm">
      {order.recipientName ? <p className="font-medium">{order.recipientName}</p> : null}
      {order.recipientPhone ? <p className="text-muted-foreground">{order.recipientPhone}</p> : null}
      {lines.length ? (
        <p className="whitespace-pre-line text-muted-foreground">{lines.join("\n")}</p>
      ) : null}
    </div>
  );
}

/**
 * One shipment. Local state holds the *draft* carrier/tracking number while the
 * operator types; it re-seeds from the server whenever the persisted value
 * actually changes, so a successful save shows the stored value while an
 * in-progress edit is not thrown away by the query's own refetch.
 */
function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const updateShipment = useUpdateShipment();
  const [trackingNumber, setTrackingNumber] = useState(shipment.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(shipment.carrier ?? "");

  useEffect(() => {
    setTrackingNumber(shipment.trackingNumber ?? "");
    setCarrier(shipment.carrier ?? "");
  }, [shipment.trackingNumber, shipment.carrier]);

  const options = shipmentStatusOptions(shipment.status);
  const isDirty = trackingNumber !== (shipment.trackingNumber ?? "") ||
    carrier !== (shipment.carrier ?? "");

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-4">
        <p className="font-mono text-xs text-muted-foreground">Order {shipment.order.id}</p>
        <p className="mt-1 text-sm">
          <span className="font-medium">{shipment.order.itemCount}</span> item
          {shipment.order.itemCount === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-muted-foreground">Order {shipment.order.status}</p>
        <p className="text-xs text-muted-foreground">Placed {formatDate(shipment.order.placedAt)}</p>
      </td>

      <td className="px-4 py-4">
        <Destination shipment={shipment} />
      </td>

      <td className="px-4 py-4">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor={`carrier-${shipment.id}`}>
          Carrier
        </label>
        <input
          id={`carrier-${shipment.id}`}
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder="DHL, Aramex, …"
          className="mt-1 w-full rounded-lg border border-input px-2 py-1.5 text-sm"
        />

        <label
          className="mt-3 block text-xs font-medium text-muted-foreground"
          htmlFor={`tracking-${shipment.id}`}
        >
          Tracking number
        </label>
        <input
          id={`tracking-${shipment.id}`}
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="1Z999AA10123456784"
          className="mt-1 w-full rounded-lg border border-input px-2 py-1.5 text-sm"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={!isDirty || updateShipment.isPending}
            onClick={() =>
              updateShipment.mutate(
                { id: shipment.id, patch: { trackingNumber, carrier } },
                { onError: (error) => alert(errorMessage(error, "Could not save label details")) },
              )
            }
            className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            {updateShipment.isPending ? "Saving…" : "Save"}
          </button>
          {isDirty ? <span className="text-xs text-amber-400">Unsaved</span> : null}
        </div>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
            STATUS_STYLES[shipment.status]
          }`}
        >
          {shipment.status.replace(/_/g, " ")}
        </span>

        {options.length ? (
          <select
            aria-label={`Update status for order ${shipment.order.id}`}
            value=""
            disabled={updateShipment.isPending}
            onChange={(event) => {
              const next = event.target.value as ShipmentStatus | "";
              if (!next) return;
              updateShipment.mutate(
                { id: shipment.id, patch: { status: next } },
                {
                  onError: (error) => {
                    alert(errorMessage(error, "Could not update status"));
                    event.target.value = "";
                  },
                },
              );
            }}
            className="mt-3 w-full rounded-lg border border-input px-2 py-1.5 text-sm"
          >
            <option value="">Move to…</option>
            {options.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No further transitions.</p>
        )}

        <p className="mt-3 text-xs text-muted-foreground/70">Updated {formatDate(shipment.updatedAt)}</p>
      </td>
    </tr>
  );
}

export default function ShippingShipmentsPage() {
  const shipmentsQuery = useShipments();
  const shipments = shipmentsQuery.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the carrier, tracking number and status. Order details are read-only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => shipmentsQuery.refetch()}
          disabled={shipmentsQuery.isFetching}
          className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {shipmentsQuery.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {shipmentsQuery.isError ? (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-400">
          {errorMessage(shipmentsQuery.error, "Could not load shipments")}
        </p>
      ) : null}

      {shipmentsQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading shipments…</p>
      ) : null}

      {shipmentsQuery.isSuccess && shipments.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          No shipments yet. They appear here as orders are paid.
        </p>
      ) : null}

      {shipments.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[60rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Label details</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <ShipmentRow key={shipment.id} shipment={shipment} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
