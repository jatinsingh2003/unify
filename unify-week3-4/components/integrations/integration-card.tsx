// components/integrations/integration-card.tsx
// Card for each platform showing connection status + Sync Now button.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCwIcon, CheckCircle2Icon, XCircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  platform: "google" | "meta" | "shopify";
  name: string;
  description: string;
  connected: boolean;
  lastSyncedAt?: string | null;
  connectHref: string;
  logo: React.ReactNode;
}

export function IntegrationCard({
  platform,
  name,
  description,
  connected,
  lastSyncedAt,
  connectHref,
  logo,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setSyncMsg("Sync started! Data will update in a few minutes.");
    } catch (e: any) {
      setSyncMsg(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
            {logo}
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge
          variant={connected ? "default" : "secondary"}
          className={cn(connected && "bg-green-500/10 text-green-600 border-green-200")}
        >
          {connected ? (
            <span className="flex items-center gap-1">
              <CheckCircle2Icon className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircleIcon className="w-3 h-3" /> Not connected
            </span>
          )}
        </Badge>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}

      {syncMsg && (
        <p className="text-xs text-muted-foreground bg-muted rounded p-2">{syncMsg}</p>
      )}

      <div className="flex gap-2 mt-auto">
        {connected ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="w-full"
          >
            {syncing ? (
              <Loader2Icon className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="w-3 h-3 mr-2" />
            )}
            Sync Now
          </Button>
        ) : (
          <Button size="sm" className="w-full" asChild>
            <a href={connectHref}>Connect</a>
          </Button>
        )}
      </div>
    </div>
  );
}
