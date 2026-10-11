"use client";

import Link from "next/link";
import { useProducts } from "@/features/products";
import { ProductCard } from "@/components/store/ProductCard";

type ProductGridConfig = {
  title: string;
  limit: number;
  categorySlug?: string;
};

/**
 * A real-data product grid, shared by every World (§5).
 *
 * It fetches the World's ACTIVE products through the cart/products data layer
 * and filters by `categorySlug` (when configured) client-side over each
 * product's `category` projection — so the "Featured gear"-style sections the
 * seed ships render actual merchandise, not the placeholder cards this
 * component used to fabricate.
 *
 * A Client Component on purpose: it is rendered both on the storefront server
 * pass and inside the Admin section editor's live preview (a Client Component),
 * so it cannot rely on being a Server Component.
 */
export function ProductGrid({
  config,
  worldId,
  worldSlug,
}: {
  config: ProductGridConfig;
  worldId?: string;
  worldSlug?: string;
}) {
  const { data: products, isLoading, error } = useProducts(worldId ?? "");

  const filtered = (products ?? [])
    .filter((product) =>
      config.categorySlug ? product.category?.slug === config.categorySlug : true,
    )
    .slice(0, config.limit);

  const showBrowseAll = worldSlug && !config.categorySlug;

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-foreground">{config.title}</h3>
        {config.categorySlug ? (
          <span className="text-sm text-muted-foreground">{config.categorySlug}</span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.min(config.limit, 4) }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="aspect-[3/4] animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          The catalog could not be loaded. Please try again.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products in this collection yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((product) =>
            worldSlug ? (
              <ProductCard key={product.id} product={product} worldSlug={worldSlug} />
            ) : null,
          )}
        </div>
      )}

      {showBrowseAll && (products?.length ?? 0) > config.limit ? (
        <Link
          href={`/${worldSlug}/products`}
          className="mt-5 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Browse all products →
        </Link>
      ) : null}
    </section>
  );
}