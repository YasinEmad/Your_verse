import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, listProducts } from "@/lib/api/products";
import { getWorldBySlug } from "@/lib/api/worlds";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { ProductPurchasePanel } from "@/components/store/ProductPurchasePanel";
import { lowestPrice, formatPrice } from "@/components/store/helpers";

export const metadata: Metadata = {
  title: "Product — Yourverse",
};

export default async function ProductDetailPage({
  params,
}: {
  params: { worldSlug: string; productSlug: string };
}) {
  const world = await getWorldBySlug(params.worldSlug).catch(() => null);
  if (!world || world.status !== "ACTIVE") {
    notFound();
  }

  const product = await getProductBySlug(world.id, params.productSlug).catch(() => null);
  if (!product) {
    notFound();
  }

  const allProducts = await listProducts(world.id).catch(() => []);
  const related = allProducts
    .filter((item) => item.id !== product.id && item.category?.id === product.category?.id)
    .slice(0, 4);

  const images = product.images ?? [];
  const priceLabel = formatPrice(lowestPrice(product));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={`/${world.slug}`} className="hover:text-foreground">
          {world.name}
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <Link href={`/${world.slug}/products`} className="hover:text-foreground">
          Products
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <ProductImage
            imageUrl={images[0]?.url}
            alt={images[0]?.altText ?? product.name}
            className="aspect-square rounded-2xl border border-border"
          />
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image) => (
                <ProductImage
                  key={image.id}
                  imageUrl={image.url}
                  alt={image.altText ?? product.name}
                  className="aspect-square rounded-xl border border-border"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            {product.category ? (
              <Link
                href={`/${world.slug}/products?category=${product.category.slug}`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                {product.category.name}
              </Link>
            ) : null}
            <h1 className="mt-2 text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{priceLabel}</p>
          </div>

          {product.description ? (
            <p className="text-base leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : null}

          <ProductPurchasePanel product={product} worldSlug={world.slug} />

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Cash on delivery. Nothing is charged today — you pay the courier when
            the parcel arrives.
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-foreground">You may also like</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} worldSlug={world.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}