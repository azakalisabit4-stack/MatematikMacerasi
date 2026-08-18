"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  Gamepad2,
  Home,
  LogOut,
  Medal,
  Menu,
  Settings,
  ShoppingBag,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";

import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { MMIcon } from "@/components/visuals/Icon";
import { Logo } from "./Logo";
import { useSession } from "./SessionProvider";
import { cn, formatNumber, relativeTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";

const NAV = [
  { href: "/panel", label: "Ana Sayfa", icon: Home },
  { href: "/oyunlar", label: "Oyunlar", icon: Gamepad2 },
  { href: "/duello", label: "Düello", icon: Swords },
  { href: "/arkadaslar", label: "Arkadaşlar", icon: Users },
  { href: "/gorevler", label: "Görevler", icon: ClipboardList },
  { href: "/basarimlar", label: "Başarımlar", icon: Medal },
  { href: "/siralamalar", label: "Sıralamalar", icon: Trophy },
  { href: "/magaza", label: "Mağaza", icon: ShoppingBag },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/panel", label: "Ana", icon: Home },
  { href: "/oyunlar", label: "Oyunlar", icon: Gamepad2 },
  { href: "/duello", label: "Düello", icon: Swords },
  { href: "/siralamalar", label: "Sıralama", icon: Trophy },
  { href: "/profil", label: "Profil", icon: Users },
];

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  iconKey: string;
  link: string | null;
  readAt: number | null;
  createdAt: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary, toasts, dismissToast, refresh } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const openBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      void refresh();
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/giris");
    router.refresh();
  };

  const isAdmin = summary?.user.roleKey === ROLE.HOCAEFENDI;

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---------------------------------------------------- MASAÜSTÜ MENÜ */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-gradient-to-b from-ink-800 to-ink-900 p-4 lg:flex">
        <Link href="/panel" className="mb-6 mt-1 block px-1">
          <Logo />
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto scroll-thin">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition",
                  active
                    ? "bg-white/95 text-ink-900 shadow-sm"
                    : "text-ink-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon size={19} strokeWidth={2.2} />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/hocaefendi"
              className={cn(
                "mt-3 flex items-center gap-3 rounded-2xl bg-sun-400/95 px-3.5 py-2.5 text-[15px] font-bold text-ink-900 shadow-sm transition hover:bg-sun-300",
              )}
            >
              <Settings size={19} strokeWidth={2.3} />
              Hocaefendi Paneli
            </Link>
          )}
        </nav>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={19} strokeWidth={2.2} />
          Çıkış Yap
        </button>
      </aside>

      {/* -------------------------------------------------------- ANA ALAN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ÜST BAR */}
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:px-5">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-xl p-2 text-ink-600 transition hover:bg-ink-50 lg:hidden"
              aria-label="Menü"
            >
              <Menu size={22} />
            </button>

            <Link href="/panel" className="lg:hidden">
              <span className="inline-flex items-center gap-2">
                <Logo size={32} withText={false} />
                <span className="text-[15px] font-black tracking-tight text-ink-900">
                  Matematik<span className="text-brand-500"> Macerası</span>
                </span>
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {summary && (
                <>
                  <span className="hidden items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1.5 text-sm font-bold text-sun-600 sm:inline-flex">
                    <MMIcon name="coins" size={16} />
                    {formatNumber(summary.progress.totalPoints)}
                  </span>
                  <span className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700 sm:inline-flex">
                    <LeagueBadge leagueKey={summary.progress.leagueKey} size={16} />
                    {formatNumber(summary.progress.leaguePoints)}
                  </span>
                </>
              )}

              <div className="relative">
                <button
                  onClick={openBell}
                  className="relative rounded-full border border-ink-100 bg-white p-2.5 text-ink-600 shadow-sm transition hover:bg-ink-50"
                  aria-label="Bildirimler"
                >
                  <Bell size={19} />
                  {!!summary?.unread && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-[11px] font-black text-white">
                      {summary.unread > 9 ? "9+" : summary.unread}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                    <div className="anim-pop absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl border border-ink-100 bg-white p-2 shadow-[0_20px_60px_-20px_rgba(26,37,64,0.45)] scroll-thin">
                      <p className="px-3 py-2 text-sm font-extrabold text-ink-900">Bildirimler</p>
                      {notifications.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-ink-400">
                          Henüz bildirimin yok.
                        </p>
                      )}
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.link ?? "#"}
                          onClick={() => setBellOpen(false)}
                          className="flex gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-ink-50"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <MMIcon name={n.iconKey} size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-ink-800">
                              {n.title}
                            </span>
                            <span className="block text-xs text-ink-400">{n.body}</span>
                            <span className="mt-0.5 block text-[11px] text-ink-300">
                              {relativeTime(n.createdAt)}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <Link href="/profil" className="shrink-0">
                <Avatar
                  avatarKey={summary?.user.avatarKey}
                  frameKey={summary?.user.frameKey}
                  size={40}
                />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------------ MOBİL MENÜ */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="anim-pop absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-gradient-to-b from-ink-800 to-ink-900 p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-xl p-2 text-ink-200 hover:bg-white/10"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto scroll-thin">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition",
                      active ? "bg-white text-ink-900" : "text-ink-200 hover:bg-white/10",
                    )}
                  >
                    <item.icon size={19} strokeWidth={2.2} />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/hocaefendi"
                  className="mt-2 flex items-center gap-3 rounded-2xl bg-sun-400 px-3.5 py-3 text-[15px] font-bold text-ink-900"
                >
                  <Settings size={19} />
                  Hocaefendi Paneli
                </Link>
              )}
            </nav>
            <button
              onClick={logout}
              className="mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold text-ink-300 hover:bg-white/10"
            >
              <LogOut size={19} /> Çıkış Yap
            </button>
          </aside>
        </div>
      )}

      {/* ------------------------------------------------- MOBİL ALT MENÜ */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition",
                  active ? "text-brand-600" : "text-ink-400",
                )}
              >
                <item.icon size={21} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* --------------------------------------------------------- TOASTLAR */}
      <div className="pointer-events-none fixed bottom-20 right-3 z-50 flex w-[min(340px,calc(100vw-1.5rem))] flex-col gap-2 lg:bottom-5">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className="anim-pop pointer-events-auto flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 text-left shadow-[0_16px_40px_-16px_rgba(26,37,64,0.5)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
              <MMIcon name={t.iconKey ?? "bell"} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-ink-900">{t.title}</span>
              {t.body && <span className="block text-xs text-ink-500">{t.body}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
