type ProductGridConfig = {
  title: string;
  limit: number;
  categorySlug?: string;
};

export function ProductGrid({ config }: { config: ProductGridConfig }) {
  const items = Array.from({ length: Math.min(config.limit, 4) }, (_, index) => ({
    id: index + 1,
    name: `${config.categorySlug ?? "Featured"} Product ${index + 1}`,
    price: (index + 1) * 19.99,
  }));

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">{config.title}</h3>
        {config.categorySlug ? (
          <span className="text-sm text-muted-foreground">{config.categorySlug}</span>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 h-32 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" />
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
