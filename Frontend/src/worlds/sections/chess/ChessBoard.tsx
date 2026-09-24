type ChessBoardConfig = {
  mode: "preview" | "puzzle";
};

export function ChessBoard({ config }: { config: ChessBoardConfig }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Chess board</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">Mode: {config.mode}</h3>
      <div className="mt-4 grid grid-cols-8 gap-1 rounded-xl bg-white p-3">
        {Array.from({ length: 64 }, (_, index) => (
          <div
            key={index}
            className={`h-8 w-8 ${index % 2 === 0 ? "bg-slate-200" : "bg-slate-100"}`}
          />
        ))}
      </div>
    </section>
  );
}
