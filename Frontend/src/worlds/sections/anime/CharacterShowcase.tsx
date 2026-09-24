type CharacterShowcaseConfig = {
  characterIds: string[];
};

export function CharacterShowcase({ config }: { config: CharacterShowcaseConfig }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-slate-900">Character showcase</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {config.characterIds.map((id) => (
          <span key={id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            {id}
          </span>
        ))}
      </div>
    </section>
  );
}
