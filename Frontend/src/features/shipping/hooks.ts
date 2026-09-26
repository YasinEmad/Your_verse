/**
 * Shipping query/mutation hooks — frontend-architecture.md §30 / §11.
 *
 * One query key, `["shipments"]`, because this surface's entire world is the
 * shipment list. Every mutation resolves through `setQueryData` with the server's
 * own response *and* invalidates the list, so the table reflects the new status
 * immediately without waiting for a refetch round trip — while the invalidation
 * still re-reads from the API so nothing depends on the client staying right.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listShipments,
  updateShipment,
  type Shipment,
  type UpdateShipmentInput,
} from "@/lib/api/shipping";

export const shipmentsKeys = {
  all: ["shipments"] as const,
};

export function useShipments() {
  return useQuery<Shipment[]>({
    queryKey: shipmentsKeys.all,
    queryFn: listShipments,
    retry: 1,
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();

  return useMutation<Shipment, Error, { id: string; patch: UpdateShipmentInput }>({
    mutationFn: ({ id, patch }) => updateShipment(id, patch),
    onSuccess: async (updated) => {
      // Immediate: swap the row in place from the server's response.
      queryClient.setQueryData<Shipment[]>(shipmentsKeys.all, (current) =>
        current?.map((shipment) => (shipment.id === updated.id ? updated : shipment)),
      );
      // Authoritative: re-read the list so nothing drifts if it does.
      await queryClient.invalidateQueries({ queryKey: shipmentsKeys.all });
    },
  });
}
