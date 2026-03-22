"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { GitCompareArrows } from "lucide-react";

export function ComparisonToggle({ active }: { active: boolean }) {
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete("compare");
    else params.set("compare", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      onClick={toggle}
      title="Toggle period-over-period comparison"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      <GitCompareArrows className="w-3.5 h-3.5" />
      Compare
    </button>
  );
}
