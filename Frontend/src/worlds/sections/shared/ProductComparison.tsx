type ProductComparisonConfig = {
  productIds: string[];
};

export function ProductComparison({ config }: { config: ProductComparisonConfig }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-xl font-semibold text-foreground">Product comparison</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {config.productIds.map((productId) => (
          <div key={productId} className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="font-medium text-foreground">{productId}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
