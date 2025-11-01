import { useCallback, useEffect, useState } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  url?: string;
  createdAt: string; // ISO
  read: boolean;
};

const STORAGE_KEY = "revu:notifications";

function readFromStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Notification[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("useNotifications: failed to read storage", e);
    return [];
  }
}

function writeToStorage(items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("useNotifications: failed to write storage", e);
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === "undefined") return [];
    return readFromStorage();
  });

  // seed sample data if empty (for now, per issue guidance)
  useEffect(() => {
    if (notifications.length === 0) {
      const now = new Date();
      const samples: Notification[] = [
        {
          id: crypto?.randomUUID?.() ?? `${now.getTime()}-1`,
          type: "success",
          title: "Sample scrape completed",
          description: "Scraped 120 reviews for sample-product-id",
          url: "/scraping-activity",
          createdAt: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
          read: false,
        },
        {
          id: crypto?.randomUUID?.() ?? `${now.getTime()}-2`,
          type: "error",
          title: "Sample scrape failed",
          description: "One of the targets returned an unexpected response",
          createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
          read: false,
        },
      ];
      setNotifications(samples);
      writeToStorage(samples);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // keep storage in sync when notifications state changes
    try {
      writeToStorage(notifications);
    } catch (e) {
      // handled in writeToStorage
    }
  }, [notifications]);

  const list = useCallback(() => notifications.slice(), [notifications]);

  const add = useCallback((n: Partial<Notification>) => {
    const now = new Date();
    const next: Notification = {
      id: n.id ?? (crypto?.randomUUID?.() ?? `${now.getTime()}`),
      type: n.type ?? "info",
      title: n.title ?? "Notification",
      description: n.description,
      url: n.url,
      createdAt: n.createdAt ?? now.toISOString(),
      read: typeof n.read === "boolean" ? n.read : false,
    };
    setNotifications((prev) => [next, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    notifications,
    list,
    add,
    markRead,
    markAllRead,
    remove,
  } as const;
}

export default useNotifications;
