export default function MenuLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16" aria-busy="true" aria-label="Loading the menu">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-4 h-12 w-80 max-w-full" />
      <div className="mt-10 flex gap-2">
        {[64, 80, 96, 72].map((w, i) => (
          <div key={i} className="skeleton h-10 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-10 grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[1.4rem] border border-cream-200 bg-white">
            <div className="skeleton aspect-[4/3] rounded-none" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-9 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
