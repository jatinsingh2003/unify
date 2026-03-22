import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { OrganizationProfile } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-12 transition-colors duration-500">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.6)]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Configuration</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white italic">Settings</h1>
          <p className="text-slate-500 text-sm mt-3 max-w-lg font-medium italic">
            Manage your workspace infrastructure, security protocols, and member visibility.
          </p>
        </div>

        <div className="rounded-[2.5rem] bg-card p-4 shadow-2xl border border-white/5 overflow-hidden">
          <OrganizationProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent border-none w-full",
                navbar: "border-r border-white/5",
                headerTitle: "text-white italic font-black tracking-tight",
                headerSubtitle: "text-slate-500 font-medium",
                organizationProfileHeader__title: "text-white",
                organizationProfileHeader__subtitle: "text-slate-500",
                button: "text-slate-300 hover:text-white transition-colors",
                profileSectionTitleText: "text-slate-400 font-bold uppercase tracking-widest text-[10px]",
                profileSectionContent: "border-b border-white/5 pb-8 mb-8 last:border-0",
                userBadgeName: "text-white font-bold",
                userBadgeHandle: "text-slate-500",
                breadcrumbsItem: "text-slate-500",
                breadcrumbsItemCurrent: "text-white font-bold",
                organizationSwitcherTrigger: "bg-white/5 text-white border-white/5 hover:bg-white/10 transition-all",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
