"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem,
  type Cart,
} from "./api";

export const cartQueryKeys = {
  all: ["cart"] as const,
};

export function useCart(enabled = true) {
  return useQuery<Cart>({
    queryKey: cartQueryKeys.all,
    queryFn: getCart,
    retry: 1,
    staleTime: 30 * 1000,
    enabled,
  });
}

function useInvalidateCart() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: cartQueryKeys.all });
}

export function useAddToCart() {
  const invalidate = useInvalidateCart();
  return useMutation<Cart, Error, { variantId: string; quantity: number }>({
    mutationFn: ({ variantId, quantity }) => addCartItem(variantId, quantity),
    onSuccess: invalidate,
  });
}

export function useUpdateCartItem() {
  const invalidate = useInvalidateCart();
  return useMutation<Cart, Error, { itemId: string; quantity: number }>({
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
    onSuccess: invalidate,
  });
}

export function useRemoveCartItem() {
  const invalidate = useInvalidateCart();
  return useMutation<Cart, Error, { itemId: string }>({
    mutationFn: ({ itemId }) => removeCartItem(itemId),
    onSuccess: invalidate,
  });
}