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

const NAV = [
  { href: "/overview",      label: "Overview",      icon: LayoutDashboard },
  { href: "/campaigns",     label: "Campaigns",     icon: Megaphone },
  { href: "/reports",       label: "Reports",       icon: BarChart3 },
  { href: "/integrations",  label: "Integrations",  icon: Plug },
  { href: "/settings",      label: "Settings",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-card h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">U</span>
        </div>
        <span className="font-semibold text-sm tracking-tight">Unify</span>
      </div>

      {/* Org switcher */}
      <div className="px-3 py-3 border-b border-border">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
            },
          }}
        />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom spacer */}
      <div className="h-4 shrink-0" />
    </aside>
  );
}
