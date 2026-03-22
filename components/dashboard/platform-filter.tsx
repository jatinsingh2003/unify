"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PLATFORMS = [
  { label: "All", value: "all" },
  { label: "Google", value: "google" },
  { label: "Meta", value: "meta" },
  { label: "Shopify", value: "shopify" },
];

export function PlatformFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(platform: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (platform === "all") params.delete("platform");
    else params.set("platform", platform);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-white/5 px-1.5 py-1.5 backdrop-blur-md">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => apply(p.value)}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${current === p.value || (p.value === "all" && !current)
              ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
