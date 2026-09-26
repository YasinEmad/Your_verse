/**
 * Shipment status flow — the client-side mirror of the state machine in
 * `ShippingService.updateShipmentStatus` (backend-architecture.md §7).
 *
 * The backend is the only authority: it rejects an illegal transition with a
 * 400 and this file cannot change that. What it buys is a UI that never *offers*
 * an illegal move — a `<select>` containing only the statuses the shipping desk
 * can actually choose right now, so a status change is one click that succeeds
 * rather than a 400 the operator has to interpret.
 *
 * Rules mirrored here, in the backend's own terms:
 *  - the happy path advances one step at a time:
 *    ORDERED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
 *  - CANCELLED is reachable from any non-delivered shipment
 *  - DELIVERED and CANCELLED are terminal (a delivered parcel cannot be
 *    cancelled, and a cancelled one cannot resume)
 */
import { shipmentStatusSchema, type ShipmentStatus } from "@/lib/api/shipping";

const HAPPY_PATH = [
  "ORDERED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly ShipmentStatus[];

export function shipmentStatusOptions(current: ShipmentStatus): ShipmentStatus[] {
  if (current === "CANCELLED" || current === "DELIVERED") {
    return [];
  }

  const index = HAPPY_PATH.indexOf(current);
  const next = index >= 0 && index < HAPPY_PATH.length - 1 ? HAPPY_PATH[index + 1] : undefined;

  return next ? [next, "CANCELLED"] : ["CANCELLED"];
}

/** Narrow an arbitrary string (e.g. from a form) to a known status, or null. */
export function parseShipmentStatus(value: string): ShipmentStatus | null {
  const parsed = shipmentStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
