"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Gauge,
  GraduationCap,
  LogOut,
  Menu,
  ShieldBan,
  Sliders,
  Swords,
  UserRound,
  X,
} from "lucide-react";

import { Logo } from "@/components/app/Logo";
import { Avatar } from "@/components/visuals/Avatar";
import { useSession } from "@/components/app/SessionProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/hocaefendi", label: "Dashboard", icon: Gauge, exact: true },
  { href: "/hocaefendi/ogrenciler", label: "Öğrenciler", icon: GraduationCap },
  { href: "/hocaefendi/istatistikler", label: "Oyun İstatistikleri", icon: BarChart3 },
  { href: "/hocaefendi/duellolar", label: "Düellolar", icon: Swords },
  { href: "/hocaefendi/moderasyon", label: "Moderasyon", icon: ShieldBan },
  { href: "/hocaefendi/sistem", label: "Sistem Ayarları", icon: Sliders },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary } = useSession();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/giris");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto scroll-thin">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition",
            isActive(item.href, item.exact)
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-200 hover:bg-white/10 hover:text-white",
          )}
        >
          <item.icon size={19} strokeWidth={2.2} />
          {item.label}
        </Link>
      ))}
      <Link
        href="/panel"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-sun-400 px-3.5 py-2.5 text-[15px] font-bold text-ink-900 transition hover:bg-sun-300"
      >
        <UserRound size={19} />
        Öğrenci Görünümü
      </Link>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col bg-gradient-to-b from-ink-800 to-ink-900 p-4 lg:flex">
        <Link href="/hocaefendi" className="mb-2 block px-1">
          <Logo />
        </Link>
        <p className="mb-5 px-1 text-[11px] font-bold uppercase tracking-widest text-sun-300">
          Hocaefendi Paneli
        </p>
        {nav}
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={19} /> Çıkış Yap
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:px-5">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-ink-600 transition hover:bg-ink-50 lg:hidden"
              aria-label="Menü"
            >
              <Menu size={22} />
            </button>
            <span className="text-[15px] font-black text-ink-900 lg:hidden">Hocaefendi Paneli</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-bold text-ink-600 sm:block">
                {summary?.user.username}
              </span>
              <Avatar avatarKey={summary?.user.avatarKey} frameKey={summary?.user.frameKey} size={38} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-10 pt-4 sm:px-5 sm:pt-6">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="anim-pop absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-gradient-to-b from-ink-800 to-ink-900 p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-ink-200 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </div>
  );
}
