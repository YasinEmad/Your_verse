/**
 * Home — the World index at `/`, replacing the Phase-1 boot placeholder.
 *
 * A Server Component (§10): it calls the same `listActiveWorlds()` the Navbar
 * does, which is React-`cache()`d, so layout + page resolve to a single request
 * per render. The grid below is a plain map over whatever came back — the count,
 * the names, the themes and the links are all decided by the DB, never by this
 * file, which contains no World data and no `worldSlug` check (§2/§32). Creating
 * a World through Super Admin makes a new card appear here on the next request
 * with no frontend change.
 *
 * The empty state is a real, reachable state: an empty (or all-INACTIVE) Worlds
 * table renders it instead of failing, and the same holds if the API is
 * unreachable — `listActiveWorlds()` resolves to `[]` in that case.
 */
import Link from "next/link";
import { listActiveWorlds } from "@/lib/api/worlds";
import { WorldCard } from "@/components/worlds/WorldCard";

export default async function Home() {
  const worlds = await listActiveWorlds();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Yourverse</h1>
        <p className="text-muted-foreground">
          Choose a World to start browsing.
        </p>
      </header>

      {worlds.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world) => (
            <li key={world.id}>
              <WorldCard world={world} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No Worlds are available yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Worlds appear here as soon as a Super Admin publishes one.
          </p>
        </div>
      )}

      <p className="mt-10 text-sm text-muted-foreground">
        Staff?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>{" "}
        to reach the dashboards.
      </p>
    </main>
  );
}
