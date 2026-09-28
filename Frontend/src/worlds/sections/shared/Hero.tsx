import Image from "next/image";

type HeroConfig = {
  title: string;
  subtitle?: string;
  imageUrl: string;
};

export function Hero({ config }: { config: HeroConfig }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Feature
          </p>
          <h2 className="text-3xl font-bold text-foreground">{config.title}</h2>
          {config.subtitle ? (
            <p className="mt-3 max-w-xl text-base text-muted-foreground">{config.subtitle}</p>
          ) : null}
        </div>
        <Image
          src={config.imageUrl}
          alt={config.title}
          width={1200}
          height={640}
          className="h-56 w-full rounded-xl object-cover"
        />
      </div>
    </section>
  );
}
