"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?unread=false");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          notificationIds: id ? [id] : [],
          markAllAsRead: !id,
        }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "low_roas": return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case "revenue_drop": return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case "spend_spike": return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case "sync_error": return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all group"
          onClick={() => setOpen(true)}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-black/40 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 bg-[#111827] border-white/10 shadow-2xl rounded-2xl overflow-hidden glass-dark mt-2" align="end">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); markAsRead(); }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
            >
              Mark all as read
            </button>
          )}
        </div>
        
        <div className="max-h-[350px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-xs text-slate-400">All systems go. No alerts at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 hover:bg-white/5 transition-colors cursor-pointer group",
                    !n.read && "bg-indigo-500/5"
                  )}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-xs leading-relaxed",
                        n.read ? "text-slate-400" : "text-white font-medium"
                      )}>
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-600 mt-1 block">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 bg-white/5 text-center border-t border-white/5">
          <button className="text-[10px] text-slate-500 hover:text-white font-bold uppercase tracking-widest transition-colors">
            View Activity History
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
