export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero skeleton */}
      <div className="relative bg-brand-950 text-white pt-24 pb-14 md:pt-32 md:pb-18">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="mb-10">
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse mb-6" />
            <div className="h-16 w-48 bg-white/10 rounded animate-pulse mb-5" />
            <div className="h-4 w-80 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-px bg-white/10 mb-8" />
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-20 bg-white/5 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Products skeleton */}
      <div className="container mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-brand-100 rounded animate-pulse" />
              ))}
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="h-14 bg-white rounded-xl border border-brand-100 animate-pulse mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-brand-100 rounded-2xl aspect-[3/4] mb-4" />
                  <div className="h-3 bg-brand-100 rounded w-1/3 mb-2" />
                  <div className="h-5 bg-brand-100 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-brand-100 rounded w-1/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
