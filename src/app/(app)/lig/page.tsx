"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Info } from "lucide-react";

import { Card, PageLoader, ProgressBar } from "@/components/ui";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { useSession } from "@/components/app/SessionProvider";
import { LEAGUES } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";

export default function LeaguePage() {
  const { summary } = useSession();
  const [distribution, setDistribution] = useState<Array<{ leagueKey: string; count: number }>>([]);
  const [ranks, setRanks] = useState<{ leagueRank: number | null; leagueInnerRank: number | null } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/leaderboards?type=league", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDistribution(data.distribution);
        setRanks(data.me);
      }
    })();
  }, []);

  if (!summary) return <PageLoader />;

  const p = summary.progress;
  const current = LEAGUES.find((l) => l.key === p.leagueKey) ?? LEAGUES[0];
  const next = LEAGUES.find((l) => l.order === current.order + 1) ?? null;
  const span = (current.max ?? p.leaguePoints) - current.min || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/panel"
          className="rounded-2xl border border-ink-200 bg-white p-2.5 text-ink-600 transition hover:bg-ink-50"
          aria-label="Geri"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-ink-900">Lig Bilgileri</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* ------------------------------------------------- LİG LİSTESİ */}
        <Card padded={false}>
          <div className="p-3">
            {LEAGUES.map((l) => {
              const active = l.key === p.leagueKey;
              const count = distribution.find((d) => d.leagueKey === l.key)?.count ?? 0;
              return (
                <div
                  key={l.key}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                    active ? "bg-sun-50 ring-2 ring-sun-300" : "hover:bg-ink-50",
                  )}
                >
                  <LeagueBadge leagueKey={l.key} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-ink-900">{l.name}</p>
                    <p className="text-[11px] font-semibold text-ink-400">
                      {l.max === null ? `${formatNumber(l.min)}+` : `${formatNumber(l.min)} - ${formatNumber(l.max)}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-ink-400">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* -------------------------------------------------- MEVCUT LİG */}
        <div className="space-y-4">
          <Card className="text-center">
            <LeagueBadge leagueKey={current.key} size={96} className="mx-auto" />
            <h2 className="mt-3 text-3xl font-black text-ink-900">{current.name}</h2>
            <p className="mt-1 text-sm font-bold text-ink-400">Lig Puanı</p>
            <p className="text-2xl font-black text-ink-900">
              {formatNumber(p.leaguePoints)}
              {current.max !== null && (
                <span className="text-ink-300"> / {formatNumber(current.max)}</span>
              )}
            </p>
            <ProgressBar
              className="mx-auto mt-3 max-w-sm"
              value={p.leaguePoints - current.min}
              max={span}
              gradient={`linear-gradient(90deg, ${current.colors[0]}, ${current.colors[1]})`}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-ink-100 p-4">
                <p className="text-xs font-bold uppercase text-ink-400">Bu ligdeki sıralaman</p>
                <p className="mt-1 text-2xl font-black text-ink-900">
                  {ranks?.leagueInnerRank ? `#${ranks.leagueInnerRank}` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 p-4">
                <p className="text-xs font-bold uppercase text-ink-400">Bir sonraki lig</p>
                {next ? (
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <LeagueBadge leagueKey={next.key} size={22} />
                    <span className="font-black text-ink-900">{next.name}</span>
                  </div>
                ) : (
                  <p className="mt-1 font-black text-ink-900">Zirvedesin!</p>
                )}
                {next && (
                  <p className="mt-0.5 text-xs font-bold text-ink-400">
                    {formatNumber(Math.max(0, next.min - p.leaguePoints))} puan kaldı
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="border-sun-200 bg-sun-50">
            <p className="flex items-start gap-2 text-sm font-semibold text-sun-600">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>
                Lig puanları yalnızca <strong>düellolardan</strong> kazanılır ve kaybedilir. XP,
                level ve toplam puan sisteminden tamamen bağımsızdır. Lig puanın hiçbir zaman
                0&apos;ın altına düşmez.
              </span>
            </p>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link href="/duello">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-ink-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-700">
                Düello yap
              </span>
            </Link>
            <Link href="/siralamalar">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50">
                Lig sıralamasını gör
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
