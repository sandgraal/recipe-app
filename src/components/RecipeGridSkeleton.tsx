/** Loading placeholder mirroring the browse/listing layout — uses the `.skeleton`
 *  shimmer primitive (neutralized under prefers-reduced-motion). */
export default function RecipeGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" aria-hidden="true">
      <div className="skeleton mb-2" style={{ height: 36, width: 200 }} />
      <div className="skeleton mb-8" style={{ height: 14, width: 90 }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card-surface overflow-hidden">
            <div className="skeleton" style={{ height: 176, borderRadius: 0 }} />
            <div className="p-4">
              <div className="skeleton mb-2" style={{ height: 16, width: '80%' }} />
              <div className="skeleton" style={{ height: 12, width: '55%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
