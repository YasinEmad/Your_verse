import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/shipping/shipments", label: "Shipping" },
] as const;

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="relative mt-20 overflow-hidden border-t border-border/80 pt-10 pb-10 text-sm text-muted-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="relative grid gap-10 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div>
          <p
            className="flex items-center gap-3 text-[0.8rem] uppercase tracking-[0.32em] text-foreground"
            style={{ fontFamily: '"Isometra", "Segoe UI", sans-serif' }}
          >
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-primary/60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Yourverse
          </p>

          <p className="mt-4 max-w-lg text-balance text-base leading-relaxed text-muted-foreground/90">
            Discover worlds built for obsessions, communities, and the things
            people keep returning to.
          </p>
        </div>

        <nav aria-label="Footer" className="justify-self-end md:w-full md:max-w-xs">
          <ul
            role="list"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[0.72rem] uppercase tracking-[0.2em]"
          >
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group relative rounded-sm py-1 text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {label}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-foreground/70 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative mt-8 flex flex-col gap-2 border-t border-border/50 pt-5 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <span>© {year} Yourverse</span>
        <span>Every world, its own storefront</span>
      </div>
    </footer>
  );
}