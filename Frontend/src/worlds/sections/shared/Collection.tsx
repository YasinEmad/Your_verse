type CollectionConfig = {
  collectionSlug: string;
};

export function Collection({ config }: { config: CollectionConfig }) {
  return (
    <section className="rounded-2xl border border-dashed border-input bg-muted p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Collection</p>
      <h3 className="mt-2 text-2xl font-bold text-foreground">{config.collectionSlug}</h3>
    </section>
  );
}
