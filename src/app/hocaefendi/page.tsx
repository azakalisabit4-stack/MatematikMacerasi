"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Eye, Gamepad2, Swords, Users } from "lucide-react";

import { Card, PageLoader, SectionTitle } from "@/components/ui";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { IconTile } from "@/components/visuals/Icon";
import { formatNumber, relativeTime } from "@/lib/utils";

interface Overview {
  studentCount: number;
  adminCount: number;
  onlineCount: number;
  gamesToday: number;
  gamesTotal: number;
  duelsTotal: number;
  activeDuels: number;
  totals: { points: number; xp: number; correct: number; wrong: number };
  gameStats: Array<{ gameKey: string; name: string; iconKey: string; plays: number; avgScore: number; bestScore: number }>;
  leagues: Array<{ leagueKey: string; name: string; count: number }>;
}

interface ActionRow {
  id: string;
  admin: string;
  target: string | null;
  action: string;
  detail: string;
  createdAt: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<{ overview: Overview; actions: ActionRow[] } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    })();
  }, []);

  if (!data) return <PageLoader />;
  const o = data.overview;
  const accuracy =
    o.totals.correct + o.totals.wrong === 0
      ? 0
      : Math.round((o.totals.correct / (o.totals.correct + o.totals.wrong)) * 100);

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#E0E7FF 0%,#F5F7FF 50%,#FFF8E9 100%)" }}
        >
          <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">Hocaefendi Paneli</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            Öğrencilerin ilerlemesini, oyun performansını ve düelloları buradan izleyebilirsin.
            Bu panel <strong>yalnızca görüntüleme</strong> amaçlıdır; devam eden bir oyuna müdahale
            edilemez, puan veya XP değiştirilemez.
          </p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Öğrenci" value={formatNumber(o.studentCount)} icon={<Users size={20} />} sub={`${o.adminCount} hocaefendi`} />
        <Stat label="Şu an çevrimiçi" value={formatNumber(o.onlineCount)} icon={<Activity size={20} />} sub="Son 70 saniye" />
        <Stat label="Bugünkü oyun" value={formatNumber(o.gamesToday)} icon={<Gamepad2 size={20} />} sub={`Toplam ${formatNumber(o.gamesTotal)}`} />
        <Stat label="Düello" value={formatNumber(o.duelsTotal)} icon={<Swords size={20} />} sub={`${o.activeDuels} aktif`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Genel toplamlar" />
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Toplam puan" value={formatNumber(o.totals.points)} />
            <Mini label="Toplam XP" value={formatNumber(o.totals.xp)} />
            <Mini label="Doğru cevap" value={formatNumber(o.totals.correct)} />
            <Mini label="Doğruluk" value={`%${accuracy}`} />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Lig dağılımı" />
          <div className="space-y-2">
            {o.leagues.map((l) => (
              <div key={l.leagueKey} className="flex items-center gap-3">
                <LeagueBadge leagueKey={l.leagueKey} size={26} />
                <span className="w-28 text-sm font-bold text-ink-700">{l.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600"
                    style={{
                      width: `${o.studentCount ? (l.count / o.studentCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-black text-ink-800">{l.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle
          title="En çok oynanan oyunlar"
          action={
            <Link href="/hocaefendi/istatistikler" className="text-sm font-bold text-brand-600 hover:underline">
              Tümü
            </Link>
          }
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {o.gameStats.slice(0, 6).map((g) => (
            <div key={g.gameKey} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
              <IconTile name={g.iconKey} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-800">{g.name}</p>
                <p className="text-xs text-ink-400">
                  {g.plays} oyun · ort. {g.avgScore} puan
                </p>
              </div>
              <span className="rounded-full bg-sun-50 px-3 py-1.5 text-xs font-black text-sun-600">
                rekor {formatNumber(g.bestScore)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Son yönetici işlemleri" subtitle="Denetim kaydı" />
        {data.actions.length === 0 ? (
          <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Henüz işlem yok.</p>
        ) : (
          <div className="space-y-2">
            {data.actions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <Eye size={17} className="text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-800">
                    {a.action}
                    {a.target ? ` → ${a.target}` : ""}
                  </p>
                  <p className="text-xs text-ink-400">
                    {a.admin} · {a.detail} · {relativeTime(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-ink-400">{label}</p>
          <p className="mt-1 text-3xl font-black text-ink-900">{value}</p>
          {sub && <p className="text-xs font-bold text-ink-400">{sub}</p>}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
      <p className="text-[11px] font-bold uppercase text-ink-400">{label}</p>
      <p className="mt-0.5 text-lg font-black text-ink-900">{value}</p>
    </div>
  );
}
