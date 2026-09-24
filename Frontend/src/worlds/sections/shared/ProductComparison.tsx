type ProductComparisonConfig = {
  productIds: string[];
};

export function ProductComparison({ config }: { config: ProductComparisonConfig }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-slate-900">Product comparison</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {config.productIds.map((productId) => (
          <div key={productId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-800">{productId}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
