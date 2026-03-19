function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3 flex gap-6">
        {["Campaign", "Platform", "Status", "Spend", "Revenue", "ROAS", "Conv.", "CPA"].map((h) => (
          <Skeleton key={h} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3.5 border-b border-border last:border-0">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}
