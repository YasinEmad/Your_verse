/**
 * features/shipping barrel — frontend-architecture.md §9 / §30.
 *
 * The narrow, role-restricted shipping surface. It re-exports only what a
 * shipping page needs: the shipment list, the update mutation, the status flow
 * mirror, and the boundary types. It deliberately exports nothing that reads a
 * product or a user — the shipping desk has no use for either, and the API
 * won't hand them over.
 */
export { useShipments, useUpdateShipment, shipmentsKeys } from "./hooks";
export { shipmentStatusOptions, parseShipmentStatus } from "./status";
export {
  shipmentSchema,
  shipmentStatusSchema,
  shippingAddressSchema,
  listShipments,
  updateShipment,
  type Shipment,
  type ShipmentStatus,
  type UpdateShipmentInput,
} from "@/lib/api/shipping";
