"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export function useOrders() {
  return useQuery<api.Order[]>({ queryKey: ["orders"], queryFn: api.listOrders, retry: 1 });
}

export function useOrder(orderId: string) {
  return useQuery<api.Order>({
    queryKey: ["orders", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Boolean(orderId),
    retry: 1,
  });
}

/**
 * Checkout. The key is supplied by the caller rather than generated here so the
 * *same* key can be reused for a retry of the same checkout — generating a fresh
 * one per attempt would defeat the idempotency the backend is enforcing.
 */
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation<
    api.Order,
    Error,
    { idempotencyKey: string; details?: api.CheckoutDetailsInput }
  >({
    mutationFn: ({ idempotencyKey, details }) =>
      api.createOrder(idempotencyKey, details),
    onSuccess: () =>
      qc.invalidateQueries({ predicate: (q) => q.queryKey?.[0] === "orders" }),
  });
}

// There is deliberately no `usePayOrder`. Yourverse is cash on delivery: the
// payment is confirmed by the shipping desk marking a parcel delivered, on the
// backend. Exposing a pay call here would be a button that lies about who
// collects the money.
