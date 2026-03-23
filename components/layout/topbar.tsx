/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Bell, Search } from "lucide-react";
import { SyncStatusBadge } from "@/components/dashboard/sync-status-badge";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { createServiceClient } from "@/lib/supabase/server";

export async function Topbar() {
  const { orgId, orgSlug } = await auth();

  // Fetch global sync status
  let lastSyncedAt = null;
  if (orgId) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("clients")
      .select("last_synced_at")
      .eq("id", orgId)
      .single();
    lastSyncedAt = data?.last_synced_at;
  }

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-6 flex-1">
        <div className="flex flex-col">
          <span className="text-ui-label text-slate-500 mb-0.5">Workspace</span>
          <span className="text-body-sm font-semibold text-white tracking-tight">{orgSlug ?? "Production"}</span>
        </div>

        <div className="h-4 w-px bg-white/10 mx-2 hidden lg:block" />

        <div className="hidden lg:flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-xl border border-white/[0.05] w-80 group focus-within:border-white/10 transition-all duration-300">
          <Search className="w-3 h-3 text-slate-600 group-focus-within:text-indigo-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none text-body-sm text-white outline-none w-full placeholder:text-slate-600"
          />
          <div className="hidden group-focus-within:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] font-medium text-slate-500 border border-white/5">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] font-medium text-slate-500 border border-white/5">K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <SyncStatusBadge initialLastSync={lastSyncedAt} />
        <div className="flex items-center gap-4 border-l border-white/10 pl-6 h-8">
          <NotificationsPanel />
          <div className="ring-1 ring-white/10 rounded-xl p-0.5">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-[10px] shadow-lg border border-white/5"
                }
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
