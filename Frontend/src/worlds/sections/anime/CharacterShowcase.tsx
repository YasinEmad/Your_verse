type CharacterShowcaseConfig = {
  characterIds: string[];
};

export function CharacterShowcase({ config }: { config: CharacterShowcaseConfig }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-xl font-semibold text-foreground">Character showcase</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {config.characterIds.map((id) => (
          <span key={id} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
            {id}
          </span>
        ))}
      </div>
    </section>
  );
}
