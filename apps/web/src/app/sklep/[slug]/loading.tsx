export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-brand-beige pt-24 pb-20">
      <div className="container mx-auto px-6 md:px-12">
        <div className="h-3 w-64 bg-brand-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="relative">
            <div className="sticky top-28">
              <div className="aspect-square rounded-3xl bg-brand-100 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="h-3 w-24 bg-brand-100 rounded animate-pulse" />
            <div className="h-12 w-3/4 bg-brand-100 rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-brand-100 rounded animate-pulse" />
            <div className="h-10 w-32 bg-brand-100 rounded animate-pulse mt-4" />
            <div className="space-y-2 mt-6">
              <div className="h-4 w-full bg-brand-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-brand-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-brand-100 rounded animate-pulse" />
            </div>
            <div className="h-14 w-full bg-brand-100 rounded-full animate-pulse mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
