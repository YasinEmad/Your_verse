type HeroConfig = {
  title: string;
  subtitle?: string;
  imageUrl: string;
};

export function Hero({ config }: { config: HeroConfig }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Feature
          </p>
          <h2 className="text-3xl font-bold text-slate-900">{config.title}</h2>
          {config.subtitle ? (
            <p className="mt-3 max-w-xl text-base text-slate-600">{config.subtitle}</p>
          ) : null}
        </div>
        <img
          src={config.imageUrl}
          alt={config.title}
          className="h-56 w-full rounded-xl object-cover"
        />
      </div>
    </section>
  );
}
