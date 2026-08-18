"use client";

import { useEffect, useState } from "react";

import { Card, PageLoader, SectionTitle } from "@/components/ui";
import { IconTile } from "@/components/visuals/Icon";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { formatNumber } from "@/lib/utils";

interface GameStat {
  gameKey: string;
  name: string;
  iconKey: string;
  plays: number;
  avgScore: number;
  bestScore: number;
  correct: number;
  wrong: number;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<GameStat[] | null>(null);
  const [leagues, setLeagues] = useState<Array<{ leagueKey: string; name: string; count: number }>>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.overview.gameStats);
        setLeagues(data.overview.leagues);
      }
    })();
  }, []);

  if (!stats) return <PageLoader />;
  const maxPlays = Math.max(1, ...stats.map((s) => s.plays));

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Oyun İstatistikleri" subtitle="Tüm oyunların oynanma ve başarı verileri" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-xs font-bold uppercase text-ink-400">
                <th className="py-3 pl-2 pr-2">Oyun</th>
                <th className="px-2 text-right">Oynanma</th>
                <th className="px-2 text-right">Ortalama</th>
                <th className="px-2 text-right">En yüksek</th>
                <th className="px-2 text-right">Doğru</th>
                <th className="px-2 text-right">Yanlış</th>
                <th className="px-2 text-right">Doğruluk</th>
                <th className="px-2">Dağılım</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const total = s.correct + s.wrong;
                const acc = total === 0 ? 0 : Math.round((s.correct / total) * 100);
                return (
                  <tr key={s.gameKey} className="border-b border-ink-50">
                    <td className="py-3 pl-2 pr-2">
                      <span className="inline-flex items-center gap-2.5">
                        <IconTile name={s.iconKey} size={32} />
                        <span className="font-bold text-ink-800">{s.name}</span>
                      </span>
                    </td>
                    <td className="px-2 text-right font-black text-ink-900">{formatNumber(s.plays)}</td>
                    <td className="px-2 text-right font-bold text-ink-600">{formatNumber(s.avgScore)}</td>
                    <td className="px-2 text-right font-bold text-sun-600">{formatNumber(s.bestScore)}</td>
                    <td className="px-2 text-right font-bold text-mint-600">{formatNumber(s.correct)}</td>
                    <td className="px-2 text-right font-bold text-coral-600">{formatNumber(s.wrong)}</td>
                    <td className="px-2 text-right font-bold text-ink-600">%{acc}</td>
                    <td className="px-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600"
                          style={{ width: `${(s.plays / maxPlays) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Ligler" subtitle="Öğrencilerin lig dağılımı" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {leagues.map((l) => (
            <div key={l.leagueKey} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-4">
              <LeagueBadge leagueKey={l.leagueKey} size={38} />
              <div>
                <p className="text-sm font-extrabold text-ink-900">{l.name}</p>
                <p className="text-xs font-bold text-ink-400">{l.count} öğrenci</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
