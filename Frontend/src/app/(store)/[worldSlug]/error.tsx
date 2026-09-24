"use client";

export default function WorldError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Something went wrong.</h2>
      <button
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
