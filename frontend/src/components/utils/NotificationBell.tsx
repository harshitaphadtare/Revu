"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Bell, X, Info, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";
import useNotifications, { Notification } from "@/hooks/useNotifications";

function getIcon(type: Notification["type"]) {
  switch (type) {
    case "success":
      return { Icon: CheckCircle2, color: "#10B981" };
    case "error":
      return { Icon: AlertCircle, color: "#EF4444" };
    case "warning":
      return { Icon: AlertTriangle, color: "#F59E0B" };
    default:
      return { Icon: Info, color: "#3B82F6" };
  }
}

function timeAgo(iso: string) {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const sec = Math.floor((now - then) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  } catch (e) {
    return "some time ago";
  }
}

export function NotificationBell() {
  const { notifications, markRead, markAllRead, remove } = useNotifications();

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const items = useMemo(() => {
    return [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [notifications]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 relative"
          style={{ backgroundColor: "transparent", border: "1px solid transparent" }}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {/* Small presence dot visible at a glance when there are unread notifications */}
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute"
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: "#ef4444",
                top: 4,
                right: 4,
                // ensure dot appears above header elements and is visible on any bg
                boxShadow: "0 0 0 2px rgba(255,255,255,0.95)",
                transform: "none",
                zIndex: 50,
              }}
            />
          )}

          {/* Numeric badge (shows only when there are multiple unread items) */}
          {unread > 1 && (
            <span
              role="status"
              aria-live="polite"
              className={cn("absolute inline-flex items-center justify-center text-xs font-medium rounded-full")}
              style={{
                background: "#ef4444",
                color: "white",
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                lineHeight: 1,
                fontSize: 10,
                borderRadius: 9999,
                border: "2px solid white",
                top: 0,
                right: 0,
                transform: "translate(40%, -40%)",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </motion.button>
      </PopoverTrigger>

      <PopoverContent className="w-96">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Notifications</div>
          <button
            onClick={() => markAllRead()}
            className="text-xs text-muted-foreground hover:underline"
            aria-label="Mark all as read"
          >
            Mark all as read
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {items.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
          {items.map((it: Notification) => {
            const { Icon, color } = getIcon(it.type);
            return (
              <div
                key={it.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md hover:bg-accent/5",
                  it.read ? "opacity-70" : "bg-opacity-0",
                )}
              >
                <div className="flex-shrink-0" style={{ marginTop: 2 }}>
                  <Icon style={{ color, width: 18, height: 18 }} />
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    markRead(it.id);
                    if (it.url) {
                      window.location.href = it.url;
                    }
                  }}
                >
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  {it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{timeAgo(it.createdAt)}</div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <button
                    onClick={() => remove(it.id)}
                    className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800/60"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
