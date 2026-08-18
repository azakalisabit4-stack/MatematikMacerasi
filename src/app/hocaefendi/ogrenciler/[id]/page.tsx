"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Eye } from "lucide-react";

import { Badge, Card, EmptyState, PageLoader, ProgressBar, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { IconTile } from "@/components/visuals/Icon";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

interface Detail {
  profile: {
    username: string;
    avatarKey: string;
    frameKey: string;
    level: number;
    xpCurrent: number;
    xpRequired: number;
    totalPoints: number;
    leagueKey: string;
    leagueName: string;
    leaguePoints: number;
    duelWins: number;
    duelLosses: number;
    duelStreak: number;
    bestDuelStreak: number;
    gamesPlayed: number;
    totalCorrect: number;
    totalWrong: number;
    accuracy: number;
    perfectGames: number;
    bestAnswerStreak: number;
    bestTimeBonus: number;
    memberSince: number;
    achievements: Array<{ key: string; name: string; iconKey: string; tier: string; unlocked: boolean }>;
    records: Array<{ gameKey: string; gameName: string; iconKey: string; variantLabel: string; bestScore: number; playCount: number }>;
  };
  detail: {
    sessions: Array<{
      id: string;
      gameName: string;
      variant: string;
      status: string;
      score: number;
      correct: number;
      wrong: number;
      startedAt: number;
      endedAt: number | null;
    }>;
    results: Array<{
      id: string;
      gameName: string;
      score: number;
      timeBonus: number;
      correct: number;
      wrong: number;
      xpEarned: number;
      isPerfect: boolean;
      isNewRecord: boolean;
      createdAt: number;
    }>;
  };
}

export default function AdminStudentDetail() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/students/${params.id}`, { cache: "no-store" });
      if (!res.ok) {
        setError((await res.json()).error ?? "Öğrenci bulunamadı.");
        return;
      }
      setData(await res.json());
    })();
  }, [params.id]);

  if (error) return <EmptyState title="Bulunamadı" description={error} />;
  if (!data) return <PageLoader />;

  const p = data.profile;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/hocaefendi/ogrenciler"
          className="rounded-2xl border border-ink-200 bg-white p-2.5 text-ink-600 transition hover:bg-ink-50"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-ink-900">Öğrenci Profili</h1>
        <Badge tone="sun" className="ml-auto">
          <Eye size={12} /> Yalnızca görüntüleme
        </Badge>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar avatarKey={p.avatarKey} frameKey={p.frameKey} size={72} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-ink-900">{p.username}</h2>
            <p className="text-sm text-ink-400">
              Level {p.level} · {relativeTime(p.memberSince)} katıldı
            </p>
            <div className="mt-2 max-w-xs">
              <ProgressBar
                value={p.xpCurrent}
                max={p.xpRequired}
                height={8}
                gradient="linear-gradient(90deg,#FFD75E,#F59E0B)"
              />
              <p className="mt-1 text-xs font-bold text-ink-400">
                {formatNumber(p.xpCurrent)} / {formatNumber(p.xpRequired)} XP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-ink-400">Lig</p>
              <p className="font-black text-ink-900">{p.leagueName}</p>
              <p className="text-xs font-bold text-ink-400">{formatNumber(p.leaguePoints)} puan</p>
            </div>
            <LeagueBadge leagueKey={p.leagueKey} size={48} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Toplam puan" value={formatNumber(p.totalPoints)} />
          <Mini label="Oyun sayısı" value={String(p.gamesPlayed)} />
          <Mini label="Doğruluk" value={`%${p.accuracy}`} />
          <Mini label="Düello" value={`${p.duelWins}G / ${p.duelLosses}M`} />
          <Mini label="Doğru cevap" value={formatNumber(p.totalCorrect)} />
          <Mini label="Yanlış cevap" value={formatNumber(p.totalWrong)} />
          <Mini label="Hatasız oyun" value={String(p.perfectGames)} />
          <Mini label="En uzun seri" value={String(p.bestAnswerStreak)} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Son oyun sonuçları" />
          {data.detail.results.length === 0 ? (
            <EmptyState title="Henüz oyun oynanmamış" />
          ) : (
            <div className="space-y-2">
              {data.detail.results.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                  <IconTile name="game" size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-800">{r.gameName}</p>
                    <p className="text-xs text-ink-400">
                      {relativeTime(r.createdAt)} · +{r.xpEarned} XP · süre bonusu +{r.timeBonus}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {r.isPerfect && <Badge tone="mint">Hatasız</Badge>}
                    {r.isNewRecord && <Badge tone="sun">Rekor</Badge>}
                    <span className="rounded-full bg-ink-800 px-2.5 py-1 text-white">{r.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Oyun oturumları" subtitle="Devam eden ve biten oturumlar" />
          {data.detail.sessions.length === 0 ? (
            <EmptyState title="Oturum kaydı yok" />
          ) : (
            <div className="space-y-2">
              {data.detail.sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      s.status === "ACTIVE"
                        ? "bg-mint-500"
                        : s.status === "FINISHED"
                          ? "bg-brand-500"
                          : "bg-ink-300",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-800">
                      {s.gameName} <span className="text-ink-400">· {s.variant}</span>
                    </p>
                    <p className="text-xs text-ink-400">
                      {s.status} · {relativeTime(s.startedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-ink-600">
                    {s.correct}D / {s.wrong}Y · {s.score}p
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Rekorlar" />
        {p.records.length === 0 ? (
          <EmptyState title="Rekor yok" />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {p.records.map((r) => (
              <div key={`${r.gameKey}-${r.variantLabel}`} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <IconTile name={r.iconKey} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-800">{r.gameName}</p>
                  <p className="text-xs text-ink-400">{r.variantLabel}</p>
                </div>
                <span className="text-sm font-black text-sun-600">{formatNumber(r.bestScore)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle title="Başarımlar" />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 xl:grid-cols-8">
          {p.achievements.map((a) => (
            <div key={a.key} className="flex flex-col items-center gap-1.5 text-center">
              <IconTile name={a.iconKey} tier={a.tier} size={44} muted={!a.unlocked} />
              <p className="text-[11px] font-bold text-ink-600">{a.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
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
