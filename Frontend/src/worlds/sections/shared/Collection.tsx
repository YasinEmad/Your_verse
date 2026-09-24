type CollectionConfig = {
  collectionSlug: string;
};

export function Collection({ config }: { config: CollectionConfig }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Collection</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">{config.collectionSlug}</h3>
    </section>
  );
}
