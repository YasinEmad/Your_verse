/**
 * Home — the World index at `/`, replacing the Phase-1 boot placeholder.
 *
 * A Server Component (§10): it calls the same `listActiveWorlds()` the Navbar
 * does, which is React-`cache()`d, so layout + page resolve to a single request
 * per render. The rail below is a plain map over whatever came back — the count,
 * the names, the themes and the links are all decided by the DB, never by this
 * file, which contains no World data and no `worldSlug` check (§2/§32). Creating
 * a World through Super Admin makes a new card appear here on the next request
 * with no frontend change.
 *
 * Worlds are laid out as a single horizontal, scroll-snapping rail rather than
 * a grid: the cards are tall doorways, staggered up and down, and the row
 * scrolls sideways whatever the number of Worlds. Zero client JS.
 *
 * The empty state is a real, reachable state: an empty (or all-INACTIVE) Worlds
 * table renders it instead of failing, and the same holds if the API is
 * unreachable — `listActiveWorlds()` resolves to `[]` in that case.
 *
 * Heading levels: the Hero owns the page's only <h1>. This section is an <h2>
 * and each WorldCard title is an <h3>.
 */
import { listActiveWorlds } from "@/lib/api/worlds";
import { Hero } from "@/components/hero/Hero";
import { WorldSection } from "@/components/worlds/WorldSection";

export default async function Home() {
  const worlds = await listActiveWorlds();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 md:px-8">
      <Hero />

      <WorldSection worlds={worlds} />
    </main>
  );
}