import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Yourverse",
  description: "Multi-World e-commerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
      `dark` on `<html>`: the palette itself is the dark one and lives on
      `:root` (globals.css), so this class is not what makes the page dark — it
      is what makes Tailwind's `dark:` variants in the shadcn primitives resolve
      to those same values rather than to a stale light copy.
    */
    <html lang="en" className="dark">
      {/*
        Root layout, above `{children}` — the Navbar is shared chrome for every
        route group (§3/§4: store, admin, super-admin, shipping), so it is
        mounted here rather than per-group, where the first two pages built would
        each have needed their own copy.

        This file stays a Server Component (§10): `<Navbar />` is one too, and the
        only `"use client"` leaf in the new chrome is the auth slot *inside* it.
        Placing an async Server Component in a Server layout is what keeps that
        true — the World list is fetched on the server and never ships the fetch
        to the browser. The providers below are the pre-existing client roots
        (`useState`/context), unchanged.
      */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col bg-black text-foreground antialiased`}
      >
        <QueryProvider>
          <ReduxProvider>
            <Navbar />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </ReduxProvider>
        </QueryProvider>
      </body>
    </html>
  );
}