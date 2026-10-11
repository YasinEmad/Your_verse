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
      className="relative mt-16 py-5 text-muted-foreground"
    >
      {/* hairline with a glowing core */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-primary blur-[2px]"
      />

      <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
        {/* brand */}
        <p
          className="flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.32em] text-foreground"
          style={{ fontFamily: '"Isometra", "Segoe UI", sans-serif' }}
        >
          <span aria-hidden className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-primary/60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          Yourverse
        </p>

        {/* tagline flanked by fading rules */}
        <p className="hidden items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.25em] text-muted-foreground/60 lg:flex">
          <span
            aria-hidden
            className="h-px w-10 bg-gradient-to-r from-transparent to-border"
          />
          Every world, its own storefront
          <span
            aria-hidden
            className="h-px w-10 bg-gradient-to-l from-transparent to-border"
          />
        </p>

        {/* nav + copyright */}
        <div className="flex items-center gap-4 font-mono text-[0.65rem] uppercase tracking-[0.2em]">
          <nav aria-label="Footer">
            <ul role="list" className="flex items-center gap-2">
              {links.map(({ href, label }, i) => (
                <li key={href} className="flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden className="text-border">
                      /
                    </span>
                  )}
                  <Link
                    href={href}
                    className="group relative rounded-sm py-0.5 text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {label}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="text-muted-foreground/50">© {year}</span>
        </div>
      </div>
    </footer>
  );
}