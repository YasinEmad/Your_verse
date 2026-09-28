"use client";

export default function WorldError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">Something went wrong.</h2>
      <button
        className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
