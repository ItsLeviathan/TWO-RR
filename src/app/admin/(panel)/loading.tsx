export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="border-b border-cream-200 bg-white/60 px-4 py-6 sm:px-8">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-6 px-4 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-[var(--radius-card)]" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
