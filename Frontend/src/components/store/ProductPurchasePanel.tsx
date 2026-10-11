"use client";

import { useState } from "react";
import Link from "next/link";
import { useAddToCart } from "@/features/cart";
import type { Product } from "@/lib/api/products";
import {
  availableStock,
  firstAvailableVariant,
  formatPrice,
  variantLabel,
} from "@/components/store/helpers";

/**
 * The buy box on the product detail page: variant + quantity + add-to-cart.
 * Defaults to the first variant with stock; multiple variants get a selector
 * driven by the product's own `attributes`.
 */
export function ProductPurchasePanel({
  product,
  worldSlug,
}: {
  product: Product;
  worldSlug: string;
}) {
  const first = firstAvailableVariant(product);
  const [variantId, setVariantId] = useState<string>(first?.id ?? "");
  const variant = product.variants.find((item) => item.id === variantId) ?? null;
  const max = variant ? availableStock(variant) : 0;
  const [quantity, setQuantity] = useState(() => (max > 0 ? 1 : 0));

  const add = useAddToCart();

  const price = variant ? formatPrice(Number(variant.price) || 0) : null;
  const multiVariant = product.variants.length > 1;
  const disabled = !variant || max <= 0 || add.isPending;

  const bump = (delta: number) => {
    setQuantity((current) => Math.min(max, Math.max(1, current + delta)));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {price ? <p className="text-3xl font-bold text-foreground">{price}</p> : null}
      {variant ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {max > 0 ? (
            `${max} in stock`
          ) : (
            <span className="text-destructive">Out of stock</span>
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-destructive">Out of stock</p>
      )}

      {multiVariant ? (
        <label className="mt-6 block text-sm font-medium">
          <span className="text-muted-foreground">Option</span>
          <select
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          >
            {product.variants.map((item) => (
              <option key={item.id} value={item.id}>
                {variantLabel(item)} — {formatPrice(Number(item.price) || 0)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => bump(-1)}
            disabled={quantity <= 1 || disabled}
            className="grid size-9 place-items-center rounded-l-lg text-foreground hover:bg-muted disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-10 text-center text-sm font-medium" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => bump(1)}
            disabled={disabled}
            className="grid size-9 place-items-center rounded-r-lg text-foreground hover:bg-muted disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!variant?.id) return;
            add.mutate({ variantId: variant.id, quantity });
          }}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {add.isPending ? "Adding…" : "Add to cart"}
        </button>
      </div>

      {add.isSuccess ? (
        <p className="mt-4 text-sm text-emerald-500" role="status">
          Added to your cart.{" "}
          <Link
            href={`/${worldSlug}/cart`}
            className="font-medium text-primary underline"
          >
            View cart
          </Link>
        </p>
      ) : null}
      {add.isError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {add.error.message}
        </p>
      ) : null}
    </div>
  );
}