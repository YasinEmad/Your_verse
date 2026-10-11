"use client";

import { ShoppingCart } from "lucide-react";
import { useAddToCart } from "@/features/cart";

export function AddToCartButton({
  variantId,
  label = "Add to cart",
  className = "",
}: {
  variantId?: string | null;
  label?: string;
  className?: string;
}) {
  const add = useAddToCart();
  const disabled = !variantId || add.isPending;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (variantId) {
          add.mutate({ variantId, quantity: 1 });
        }
      }}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      {add.isPending ? "Adding…" : label}
    </button>
  );
}