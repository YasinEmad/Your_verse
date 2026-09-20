/**
 * AuthProvider — frontend-architecture.md §13.
 *
 * Feeds `{ user, isAuthenticated, isLoading }` to the whole tree. Client
 * Component mounted once in `app/layout.tsx`. UI-only: it's what nav hides and
 * what redirects away from `/admin` pre-flight — the NestJS guards are the real
 * authorization boundary (§13 / §15 backend), this context never is one.
 */
"use client";

import {
  createContext,
  useMemo,
  useContext,
  type ReactNode,
} from "react";
import { useSession, type SessionState } from "@/features/auth";

export interface AuthContextValue {
  user: SessionState["user"];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useSession();

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated, isLoading }),
    [user, isAuthenticated, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error(
      "useAuthContext must be used within an <AuthProvider> (§13).",
    );
  }
  return ctx;
}
