import type { Product, ProductVariant } from "@/lib/api/products";

/** The first variant with stock actually on sale, or null when nothing is buyable. */
export function firstAvailableVariant(product: Product): ProductVariant | null {
  const available = product.variants.filter(
    (variant) => (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0) > 0,
  );
  return available[0] ?? (product.variants.length > 0 ? product.variants[0] : null);
}

/** Lowest price across variants — the price a "from" label should show. */
export function lowestPrice(product: Product): number {
  if (product.variants.length === 0) {
    return 0;
  }
  return Math.min(...product.variants.map((variant) => Number(variant.price) || 0));
}

export function availableStock(variant: ProductVariant): number {
  return Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0));
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatPrice(value: number, currency = "USD"): string {
  const formatter =
    currencyFormatterCache.get(currency) ??
    new Intl.NumberFormat("en-US", { style: "currency", currency });
  currencyFormatterCache.set(currency, formatter);
  return formatter.format(value);
}

export function variantLabel(variant: ProductVariant): string {
  const attributes = variant.attributes ?? {};
  const values = Object.entries(attributes)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  return values || variant.sku;
}