/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
// components/dashboard/sync-status-badge.tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function SyncStatusBadge({ initialLastSync }: { initialLastSync: string | null }) {
  const [status, setStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [lastSync, setLastSync] = useState<string | null>(initialLastSync);

  useEffect(() => {
    const handleSyncEvent = (e: any) => {
      if (e.detail?.status === "started") {
        setStatus("syncing");
        toast.info("Sync started", { description: "Updating your marketing data..." });
      } else if (e.detail?.status === "completed") {
        setStatus("idle");
        const now = new Date().toISOString();
        setLastSync(now);
        toast.success("Sync completed", { description: "Marketing data is now up to date." });
      } else if (e.detail?.status === "error") {
        setStatus("error");
        toast.error("Sync failed", { description: e.detail?.message || "Something went wrong." });
      }
    };

    window.addEventListener("sync-status", handleSyncEvent);
    return () => window.removeEventListener("sync-status", handleSyncEvent);
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-1 rounded-full text-ui-label transition-all duration-500 border",
      status === "syncing" 
        ? "bg-indigo-500/5 text-indigo-400/80 border-indigo-500/10 animate-pulse" 
        : status === "error"
        ? "bg-rose-500/5 text-rose-400/80 border-rose-500/10"
        : "bg-white/[0.02] text-slate-500 border-white/[0.05]"
    )}>
      {status === "syncing" ? (
        <>
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Syncing</span>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="w-2.5 h-2.5" />
          <span>Failed</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
          <span>
            {lastSync 
              ? `Synced ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}` 
              : "Pending"}
          </span>
        </>
      )}
    </div>
  );
}
