"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export function useOrders() {
  return useQuery<api.Order[]>({ queryKey: ["orders"], queryFn: api.listOrders, retry: 1 });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation<api.Order, Error, void>({
    mutationFn: () => api.createOrder(),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey?.[0] === "orders" }),
  });
}

export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation<api.Order, Error, { id: string; amount: number }>({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.payOrder(id, "mock", "ui-manual", amount),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey?.[0] === "orders" }),
  });
}
