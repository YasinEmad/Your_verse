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
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-3">
        {config.features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 text-2xl">{feature.icon}</div>
            <h4 className="text-lg font-semibold text-foreground">{feature.title}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
