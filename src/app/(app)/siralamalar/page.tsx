"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import { Card, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { useSession } from "@/components/app/SessionProvider";
import { cn, formatNumber } from "@/lib/utils";

interface Row {
  rank: number;
  userId: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  level: number;
  totalPoints: number;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  online: boolean;
}

export default function LeaderboardsPage() {
  const { summary } = useSession();
  const [type, setType] = useState<"points" | "league">("points");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<{ pointsRank: number | null; leagueRank: number | null; totalStudents: number } | null>(null);

  const load = useCallback(async (t: string) => {
    setRows(null);
    const res = await fetch(`/api/leaderboards?type=${t}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setMe(data.me);
    }
  }, []);

  useEffect(() => {
    void load(type);
  }, [type, load]);

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const valueOf = (r: Row) => (type === "points" ? r.totalPoints : r.leaguePoints);

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#FEF3C7 0%,#FFF7E6 45%,#EEF4FF 100%)" }}
        >
          <h1 className="flex items-center gap-2 text-2xl font-black text-ink-900 sm:text-3xl">
            <Trophy size={26} /> Sıralamalar
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-600">
            Puan sıralaması tek kişilik oyunlardan, lig sıralaması düellolardan gelir.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit" padded={false}>
          <div className="p-2">
            {[
              { key: "points", label: "Puan Sıralaması", hint: "Toplam puana göre" },
              { key: "league", label: "Lig Sıralaması", hint: "Lig puanına göre" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key as "points" | "league")}
                className={cn(
                  "mb-1 w-full rounded-2xl px-4 py-3 text-left transition",
                  type === t.key ? "bg-ink-800 text-white" : "text-ink-600 hover:bg-ink-50",
                )}
              >
                <span className="block text-sm font-extrabold">{t.label}</span>
                <span className={cn("block text-xs", type === t.key ? "text-ink-200" : "text-ink-400")}>
                  {t.hint}
                </span>
              </button>
            ))}
          </div>
          {me && (
            <div className="border-t border-ink-100 p-4">
              <p className="text-xs font-bold uppercase text-ink-400">Senin sıran</p>
              <p className="mt-1 text-2xl font-black text-ink-900">
                {type === "points"
                  ? me.pointsRank
                    ? `#${me.pointsRank}`
                    : "—"
                  : me.leagueRank
                    ? `#${me.leagueRank}`
                    : "—"}
              </p>
              <p className="text-xs text-ink-400">{me.totalStudents} öğrenci arasında</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {!rows ? (
            <PageLoader label="Sıralama yükleniyor..." />
          ) : (
            <>
              {podium.length > 0 && (
                <Card>
                  <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                    {[1, 0, 2].map((i) => {
                      const r = podium[i];
                      if (!r) return <div key={i} />;
                      const place = i + 1;
                      const styles =
                        place === 1
                          ? { bg: "from-sun-100 to-sun-300", h: "h-32 sm:h-40", badge: "bg-sun-400" }
                          : place === 2
                            ? { bg: "from-ink-100 to-ink-200", h: "h-24 sm:h-32", badge: "bg-ink-300" }
                            : { bg: "from-[#F5D0B0] to-[#E0A878]", h: "h-20 sm:h-28", badge: "bg-[#D08B54]" };
                      return (
                        <div key={r.userId} className="flex flex-col items-center">
                          <Avatar avatarKey={r.avatarKey} frameKey={r.frameKey} size={place === 1 ? 68 : 54} />
                          <Link
                            href={`/profil/${encodeURIComponent(r.username)}`}
                            className="mt-2 max-w-full truncate text-sm font-black text-ink-900 hover:underline"
                          >
                            {r.username}
                          </Link>
                          <p className="text-lg font-black text-ink-900">{formatNumber(valueOf(r))}</p>
                          <div
                            className={cn(
                              "mt-2 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2",
                              styles.bg,
                              styles.h,
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white",
                                styles.badge,
                              )}
                            >
                              {place}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <Card padded={false}>
                <div className="p-5 pb-3">
                  <SectionTitle
                    className="mb-0"
                    title={type === "points" ? "Puan Sıralaması" : "Lig Sıralaması"}
                    subtitle="Hocaefendi hesapları sıralamalara dâhil edilmez."
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-y border-ink-100 bg-ink-50/60 text-xs font-bold uppercase text-ink-400">
                        <th className="py-2.5 pl-5 pr-2">Sıra</th>
                        <th className="px-2">Kullanıcı</th>
                        <th className="px-2">Lig</th>
                        <th className="px-2 text-right">Level</th>
                        <th className="py-2.5 pl-2 pr-5 text-right">
                          {type === "points" ? "Toplam Puan" : "Lig Puanı"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((r) => {
                        const isMe = r.userId === summary?.user.id;
                        return (
                          <tr
                            key={r.userId}
                            className={cn(
                              "border-b border-ink-50 text-sm",
                              isMe && "bg-mint-100/50 font-bold",
                            )}
                          >
                            <td className="py-2.5 pl-5 pr-2 font-black text-ink-500">{r.rank}</td>
                            <td className="px-2">
                              <Link
                                href={`/profil/${encodeURIComponent(r.username)}`}
                                className="inline-flex items-center gap-2.5 hover:underline"
                              >
                                <Avatar avatarKey={r.avatarKey} frameKey={r.frameKey} size={30} online={r.online} />
                                <span className="font-bold text-ink-800">{r.username}</span>
                              </Link>
                            </td>
                            <td className="px-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500">
                                <LeagueBadge leagueKey={r.leagueKey} size={18} />
                                {r.leagueName}
                              </span>
                            </td>
                            <td className="px-2 text-right font-bold text-ink-600">{r.level}</td>
                            <td className="py-2.5 pl-2 pr-5 text-right font-black text-ink-900">
                              {formatNumber(valueOf(r))}
                            </td>
                          </tr>
                        );
                      })}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-ink-400">
                            Henüz sıralamada kimse yok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
