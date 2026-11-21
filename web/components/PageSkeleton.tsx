/** Route-level skeleton while a Server Component reads the chain. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5" aria-busy aria-label={label}>
      <div className="h-28 animate-pulse rounded-2xl bg-leaf-100" />
      <div className="card space-y-3">
        <div className="h-6 w-1/3 animate-pulse rounded bg-coffee-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-coffee-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-coffee-100" />
      </div>
      <div className="card h-40 animate-pulse bg-coffee-50" />
      <p className="text-center text-sm text-coffee-600">{label}</p>
    </div>
  );
}
