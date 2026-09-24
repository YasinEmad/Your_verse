type FeatureItem = {
  title: string;
  body: string;
  icon: string;
};

type FeatureSectionConfig = {
  features: FeatureItem[];
};

export function FeatureSection({ config }: { config: FeatureSectionConfig }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-3">
        {config.features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-2xl">{feature.icon}</div>
            <h4 className="text-lg font-semibold text-slate-900">{feature.title}</h4>
            <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
