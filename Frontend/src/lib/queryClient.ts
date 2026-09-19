import { QueryClient } from "@tanstack/react-query";

/**
 * Factory that creates a fresh QueryClient (frontend-architecture.md §11, §24).
 *
 * Deliberately NOT a module-level singleton: getQueryClient() is called once
 * per client-side mount from QueryProvider (via useState) so SSR and RSC can
 * stream multiple requests without leaking one shared cache across them.
 */
export function getQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}