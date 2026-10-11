"use client";

import Link from "next/link";
import type { Product } from "@/lib/api/products";
import { AddToCartButton } from "./AddToCartButton";
import { firstAvailableVariant, formatPrice, lowestPrice } from "./helpers";
import { ProductImage } from "./ProductImage";

/**
 * One product in a grid context (World home section, catalog listing, related
 * products). The whole card links to the product detail route; the quick-add
 * button sits outside that Link so the two interactions do not nest.
 */
export function ProductCard({
  product,
  worldSlug,
}: {
  product: Product;
  worldSlug: string;
}) {
  const buyable = firstAvailableVariant(product);
  const outOfStock =
    product.variants.length > 0 &&
    product.variants.every(
      (variant) => (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0) <= 0,
    );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/${worldSlug}/products/${product.slug}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ProductImage imageUrl={product.images?.[0]?.url} alt={product.images?.[0]?.altText ?? product.name} />
        <div className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.category?.name ?? "Product"}
          </p>
          <h3 className="mt-1 line-clamp-1 font-medium text-foreground">{product.name}</h3>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border p-4 pt-3">
        <div>
          <p className="text-base font-semibold text-foreground">
            {formatPrice(lowestPrice(product))}
          </p>
          {outOfStock ? (
            <p className="text-xs text-destructive">Out of stock</p>
          ) : (
            <p className="text-xs text-muted-foreground">In stock</p>
          )}
        </div>
        <AddToCartButton variantId={buyable?.id} label="Add" />
      </div>
    </div>
  );
}