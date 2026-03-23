/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
// components/integrations/integration-card.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCwIcon, CheckCircle2Icon, XCircleIcon, Loader2Icon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopifyConnectModal } from "./shopify-connect-modal";

interface Props {
  platform: "google" | "meta" | "shopify";
  name: string;
  description: string;
  connected: boolean;
  lastSyncedAt?: string | null;
  connectHref: string;
  logo: React.ReactNode;
}

export function IntegrationCard({ platform, name, description, connected, lastSyncedAt, connectHref, logo }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isShopifyModalOpen, setIsShopifyModalOpen] = useState(false);

  async function handleSync() {
    setSyncing(true); setSyncMsg(null);
    try {
      window.dispatchEvent(new CustomEvent("sync-status", { detail: { status: "started" } }));
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      window.dispatchEvent(new CustomEvent("sync-status", { detail: { status: "completed" } }));
      setSyncMsg("Sync started! Data will update in a few minutes.");
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      router.refresh();
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl bg-card p-6 shadow-sm border border-white/5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/20 group relative overflow-hidden">
      {/* Subtle hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 transition-colors group-hover:border-indigo-500/30 group-hover:bg-white/[0.05]">
            {logo}
          </div>
          <div>
            <p className="text-base font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-satoshi)' }}>{name}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{platform}</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest border transition-all duration-300",
          connected 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" 
            : "bg-white/[0.02] text-slate-500 border-white/[0.05]"
        )}>
          {connected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />}
          {connected ? "Active" : "Pending"}
        </div>
      </div>

      <p className="relative text-body-sm mt-5 z-10">{description}</p>

      {lastSyncedAt && (
        <div className="relative mt-6 flex items-center justify-between px-3 py-3 bg-white/[0.02] rounded-xl border border-white/[0.05] z-10">
          <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">Sync Integrity</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium">Last Sync</span>
            <span className="text-[10px] text-indigo-400 font-medium">
              {new Date(lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {syncMsg && (
        <div className="relative mt-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11px] text-indigo-300 leading-normal z-10">
          {syncMsg}
        </div>
      )}

      <div className="relative flex gap-2 mt-8 z-10">
        {connected ? (
          <>
            <Button 
              size="sm" 
              onClick={handleSync} 
              disabled={syncing || disconnecting} 
              className="flex-1 bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/[0.05] rounded-xl h-10 font-medium transition-all"
            >
              {syncing ? <Loader2Icon className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCwIcon className="w-3.5 h-3.5 mr-2" />}
              Sync Now
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDisconnect} 
              disabled={syncing || disconnecting} 
              className="bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl w-10 h-10 p-0 transition-all"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button 
            size="sm" 
            className="w-full bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl h-10 font-medium transition-all shadow-lg shadow-indigo-500/20" 
            onClick={() => platform === "shopify" ? setIsShopifyModalOpen(true) : (window.location.href = connectHref)}
          >
            Authenticate {name}
          </Button>
        )}
      </div>

      {platform === "shopify" && (
        <ShopifyConnectModal
          open={isShopifyModalOpen}
          onOpenChange={setIsShopifyModalOpen}
        />
      )}
    </div>
  );
}
