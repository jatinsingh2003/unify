function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}

export function TableSkeleton() {
  return (
    <div className="bg-card overflow-hidden">
      <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4 flex gap-8">
        {["Campaign", "Status", "Allocation", "Yield", "Efficiency", "Conv.", "CPA", "CTR"].map((h) => (
          <Skeleton key={h} className="h-2.5 w-16 opacity-20" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-8 px-6 py-5 border-b border-white/5 last:border-0">
          <div className="space-y-2.5 w-48">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-24 opacity-30" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md opacity-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 rounded-full opacity-40" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-10 opacity-30" />
        </div>
      ))}
    </div>
  );
}
