import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategories } from "@/lib/api/categories";
import { listProducts, type Product } from "@/lib/api/products";
import { getWorldBySlug } from "@/lib/api/worlds";
import { ProductCard } from "@/components/store/ProductCard";

export const metadata: Metadata = {
  title: "Products — Yourverse",
};

type SearchParams = { [key: string]: string | string[] | undefined };

const PER_PAGE = 12;

type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
];

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    case "price-asc":
      return sorted.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    case "price-desc":
      return sorted.sort((a, b) => lowestPrice(b) - lowestPrice(a));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

function lowestPrice(product: Product): number {
  if (product.variants.length === 0) {
    return 0;
  }
  return Math.min(...product.variants.map((variant) => Number(variant.price) || 0));
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: { worldSlug: string };
  searchParams: SearchParams;
}) {
  const world = await getWorldBySlug(params.worldSlug).catch(() => null);
  if (!world || world.status !== "ACTIVE") {
    notFound();
  }

  const categorySlug = asString(searchParams.category);
  const query = asString(searchParams.q)?.toLowerCase();
  const sort: SortKey = SORT_OPTIONS.some((option) => option.value === searchParams.sort)
    ? (searchParams.sort as SortKey)
    : "featured";
  const page = Math.max(1, Number(asString(searchParams.page)) || 1);

  const [categories, allProducts] =
    await Promise.all([
      listCategories(world.id).catch(() => []),
      listProducts(world.id).catch(() => []),
    ]);

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  const filtered = allProducts.filter((product) => {
    if (activeCategory && product.category?.id !== activeCategory.id) {
      return false;
    }
    if (query) {
      const haystack = `${product.name} ${product.description ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const sorted = sortProducts(filtered, sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageIndex = Math.min(page, totalPages) - 1;
  const paged = sorted.slice(pageIndex * PER_PAGE, pageIndex * PER_PAGE + PER_PAGE);

  const withParam = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      category: activeCategory?.slug,
      q: asString(searchParams.q),
      sort,
      page: pageIndex + 1 > 1 ? String(pageIndex + 1) : undefined,
    };
    for (const [key, value] of Object.entries({ ...base, ...patch })) {
      if (value) {
        params.set(key, value);
      }
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={`/${world.slug}`} className="hover:text-foreground">
          {world.name}
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-foreground">Products</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          {activeCategory ? (
            <p className="mt-1 text-sm text-muted-foreground">{activeCategory.name}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <form method="get" action={`/${world.slug}/products`} className="flex gap-2">
          <input
            type="hidden"
            name="category"
            value={activeCategory?.slug ?? ""}
          />
          <input
            type="search"
            name="q"
            defaultValue={asString(searchParams.q) ?? ""}
            placeholder="Search products"
            aria-label="Search products"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <select
            name="sort"
            defaultValue={sort}
            aria-label="Sort products"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/${world.slug}/products${withParam({ category: undefined, page: "1" })}`}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            activeCategory
              ? "border-border text-muted-foreground hover:border-ring"
              : "border-primary bg-primary/10 text-primary"
          }`}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/${world.slug}/products${withParam({
              category: category.slug,
              page: "1",
            })}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              category.id === activeCategory?.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-ring"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {paged.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No products match those filters.</p>
          <Link
            href={`/${world.slug}/products`}
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paged.map((product) => (
            <ProductCard key={product.id} product={product} worldSlug={world.slug} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
          {pageIndex > 0 ? (
            <Link
              href={`/${world.slug}/products${withParam({ page: String(pageIndex) })}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-ring"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {totalPages}
          </span>
          {pageIndex + 1 < totalPages ? (
            <Link
              href={`/${world.slug}/products${withParam({ page: String(pageIndex + 2) })}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-ring"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}