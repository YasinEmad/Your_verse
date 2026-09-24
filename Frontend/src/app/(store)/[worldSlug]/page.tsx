"use client";

import { useParams } from "next/navigation";
import { useWorld } from "@/features/products/hooks";

export default function WorldHome() {
  const params = useParams<{ worldSlug?: string }>();
  const worldSlug = typeof params?.worldSlug === "string" ? params.worldSlug : "anime";
  const { data, isLoading, error } = useWorld(worldSlug);

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Loading world…</p>;
  }

  if (error) {
    return <p className="p-8 text-red-500">Unable to load world: {String(error)}</p>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">{data?.name ?? "World"}</h1>
      <pre className="overflow-x-auto rounded bg-slate-100 p-4 text-sm text-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
