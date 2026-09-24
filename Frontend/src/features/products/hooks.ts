import { useQuery } from "@tanstack/react-query";
import { getWorldBySlug, type WorldPayload } from "@/lib/api/worlds";
import { getProductBySlug, listProducts, type Product, type ProductListFilters } from "@/lib/api/products";

export const worldQueryKeys = {
  all: ["world"] as const,
  bySlug: (slug: string) => ["world", slug] as const,
};

export const productQueryKeys = {
  all: ["products"] as const,
  list: (worldId: string, filters: ProductListFilters = {}) => ["products", worldId, filters] as const,
  bySlug: (worldId: string, slug: string) => ["products", worldId, "slug", slug] as const,
};

export function useWorld(slug: string) {
  return useQuery<WorldPayload>({
    queryKey: worldQueryKeys.bySlug(slug),
    queryFn: () => getWorldBySlug(slug),
    enabled: Boolean(slug && slug.length > 0),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useProducts(worldId: string, filters: ProductListFilters = {}) {
  return useQuery<Product[]>({
    queryKey: productQueryKeys.list(worldId, filters),
    queryFn: () => listProducts(worldId, filters),
    enabled: Boolean(worldId && worldId.length > 0),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useProduct(worldId: string, slug: string) {
  return useQuery<Product>({
    queryKey: productQueryKeys.bySlug(worldId, slug),
    queryFn: () => getProductBySlug(worldId, slug),
    enabled: Boolean(worldId && worldId.length > 0 && slug && slug.length > 0),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
