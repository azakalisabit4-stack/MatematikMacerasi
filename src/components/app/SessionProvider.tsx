"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Summary } from "@/lib/summary";

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  iconKey?: string;
  tone?: "info" | "success" | "warn" | "danger";
  link?: string;
}

interface Ctx {
  summary: Summary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  /** Düello/bildirim olayları için abonelik */
  onEvent: (handler: (e: { type: string; payload: unknown }) => void) => () => void;
}

const SessionCtx = createContext<Ctx | null>(null);

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession bir SessionProvider içinde kullanılmalı");
  return ctx;
}

export function SessionProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: Summary | null;
}) {
  const [summary, setSummary] = useState<Summary | null>(initial);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const handlers = useRef(new Set<(e: { type: string; payload: unknown }) => void>());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      /* çevrimdışı */
    } finally {
      setLoading(false);
    }
  }, []);

  const pushToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const onEvent = useCallback((handler: (e: { type: string; payload: unknown }) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  // --- Gerçek zamanlı olaylar (SSE) ---
  useEffect(() => {
    if (!initial) return;
    let es: EventSource | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/events");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type: string; payload: unknown };
          handlers.current.forEach((h) => h(data));
          if (data.type === "notification") {
            const p = data.payload as { title: string; body: string; iconKey: string; link?: string };
            pushToast({ title: p.title, body: p.body, iconKey: p.iconKey, link: p.link ?? undefined });
            void refresh();
          }
          if (data.type === "duel:invite") void refresh();
        } catch {
          /* yoksay */
        }
      };
      es.onerror = () => {
        es?.close();
        if (!closed) retry = setTimeout(connect, 4000);
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, [initial, pushToast, refresh]);

  // --- Çevrimiçi kalp atışı ---
  useEffect(() => {
    if (!initial) return;
    const interval = setInterval(() => void refresh(), 45000);
    return () => clearInterval(interval);
  }, [initial, refresh]);

  const value = useMemo<Ctx>(
    () => ({ summary, loading, refresh, toasts, pushToast, dismissToast, onEvent }),
    [summary, loading, refresh, toasts, pushToast, dismissToast, onEvent],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
