"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Plug, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PlatformName = "google_ads" | "meta_ads" | "shopify";

interface Integration {
  status: string;
  account_id?: string;
  last_sync_at?: string;
}

interface IntegrationCardProps {
  platform: PlatformName;
  label: string;
  description: string;
  integration?: Integration;
  connectHref: string;
  comingSoon?: boolean;
}

const PLATFORM_ICONS: Record<PlatformName, string> = {
  google_ads: "G",
  meta_ads:   "f",
  shopify:    "S",
};

const PLATFORM_COLORS: Record<PlatformName, string> = {
  google_ads: "bg-blue-500",
  meta_ads:   "bg-[#0866FF]",
  shopify:    "bg-[#96BF48]",
};

export function IntegrationCard({
  platform,
  label,
  description,
  integration,
  connectHref,
  comingSoon = false,
}: IntegrationCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const isConnected = integration?.status === "active";
  const hasError = integration?.status === "error";

  async function triggerSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setSyncMsg("Rate limited — try again in 30 min");
      } else if (res.ok) {
        setSyncMsg("Sync started");
      } else {
        setSyncMsg(data.error ?? "Sync failed");
      }
    } catch {
      setSyncMsg("Network error");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 flex flex-col gap-4 transition-all",
      isConnected ? "border-border" : "border-dashed border-border",
      hasError && "border-rose-200 bg-rose-50/30"
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0",
          PLATFORM_COLORS[platform]
        )}>
          {PLATFORM_ICONS[platform]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{label}</h3>
            {isConnected && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            {hasError && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            )}
            {comingSoon && !integration && (
              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Status */}
      {integration && (
        <div className="text-xs text-muted-foreground space-y-0.5 bg-muted/50 rounded-md px-3 py-2">
          {integration.account_id && (
            <p>Account: <span className="font-mono text-foreground">{integration.account_id}</span></p>
          )}
          {integration.last_sync_at && (
            <p>Last synced: {format(new Date(integration.last_sync_at), "MMM d, h:mm a")}</p>
          )}
          {hasError && (
            <p className="text-rose-600">Connection error — reconnect to fix</p>
          )}
        </div>
      )}

      {syncMsg && (
        <p className="text-xs text-muted-foreground">{syncMsg}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {!isConnected ? (
          <a
            href={comingSoon ? undefined : connectHref}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors",
              comingSoon
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Plug className="w-3.5 h-3.5" />
            {comingSoon ? "Coming Soon" : "Connect"}
          </a>
        ) : (
          <>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
            <a
              href={connectHref}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Reconnect
            </a>
          </>
        )}
      </div>
    </div>
  );
}
