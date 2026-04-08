export default function KawiarniaLoading() {
  return (
    <div className="min-h-screen bg-brand-950 animate-pulse">
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-64 bg-white/10 rounded mx-auto" />
          <div className="h-6 w-40 bg-white/5 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
