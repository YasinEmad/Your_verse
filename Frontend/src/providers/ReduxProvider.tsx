"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/providers/store";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // One store instance per client mount via useRef — the SSR-safe pattern.
  // Server state never touches Redux (frontend-architecture.md §11).
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}