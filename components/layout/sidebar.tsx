"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Plug,
  Settings,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { motion } from "framer-motion";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/5 bg-background h-screen sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/[0.05] shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/80 to-blue-600/80 flex items-center justify-center shrink-0 ring-1 ring-white/10">
          <span className="text-white font-bold text-xs tracking-tighter">U</span>
        </div>
        <span className="font-semibold text-lg text-white tracking-tight" style={{ fontFamily: 'var(--font-satoshi)' }}>Unify</span>
      </div>

      {/* Org switcher */}
      <div className="px-4 py-5 border-b border-white/[0.05]">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-between rounded-xl px-3 py-2 text-ui-label text-slate-500 hover:bg-white/[0.02] hover:text-white transition-all border border-white/[0.05]",
              organizationPreviewTitle: "text-white font-semibold",
              organizationPreviewSubtitle: "text-slate-500",
            },
          }}
        />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
        <div className="px-3 mb-4 text-ui-label text-slate-600">Menu</div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="block group">
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                  active
                    ? "text-white bg-white/[0.05] border border-white/[0.05]"
                    : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-indigo-500 rounded-full"
                  />
                )}
                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400")} />
                <span className="flex-1 text-body-sm">{label}</span>
                {active && (
                  <ChevronRight className="w-3 h-3 text-white/20" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User / Settings Footer stub if needed */}
      <div className="mt-auto p-4 border-t border-white/[0.05]">
        <div className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] group hover:bg-white/[0.04] transition-all cursor-pointer">
          <p className="text-ui-label text-slate-500 mb-1">Current Plan</p>
          <p className="text-xs font-semibold text-white mb-2 leading-none" style={{ fontFamily: 'var(--font-satoshi)' }}>Pro Developer</p>
          <div className="w-full bg-white/[0.05] rounded-full h-1 mt-3">
            <div className="bg-indigo-500 h-1 rounded-full w-[85%]" />
          </div>
        </div>
      </div>
    </aside>
  );
}
