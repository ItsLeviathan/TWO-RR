export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="skeleton aspect-square rounded-[2rem]" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-14 w-3/4" />
          <div className="skeleton h-7 w-28" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
