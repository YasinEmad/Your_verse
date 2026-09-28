/**
 * Footer — frontend-architecture.md §4 calls the store shell "header/footer,
 * world theme", so a footer exists. It is mounted in the **root** layout beside
 * the Navbar rather than in `(store)/layout.tsx`, because the root layout is the
 * only shell every route shares: putting it in the store group would leave Home
 * (which lives at `app/page.tsx`, outside the group) without one.
 *
 * Static, World-agnostic content only — no World names, no counts, no
 * `worldSlug` branching (§2/§32). Nothing here fetches: a footer is not worth a
 * request, and a dynamic one would drag every route into per-request rendering.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground md:px-8">
        <p className="font-medium text-foreground">Yourverse</p>
        <p>Multi-World storefront.</p>
      </div>
    </footer>
  );
}
