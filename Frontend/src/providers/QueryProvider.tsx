"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queryClient";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One query client per client-side mount (§11/§24) — the useRef-with-guard
  // pattern Next.js docs warn against (module singleton across SSR renders)
  // is avoided; useState initializer keeps a stable instance for this mount.
  const [queryClient] = useState(getQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}