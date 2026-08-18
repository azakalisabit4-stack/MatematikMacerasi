"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { Badge, Card, PageLoader, ProgressBar, SectionTitle } from "@/components/ui";
import { IconTile } from "@/components/visuals/Icon";
import { useSession } from "@/components/app/SessionProvider";
import { cn } from "@/lib/utils";

interface AchievementRow {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  tier: string;
  category: string;
  target: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  GAME: "Oyun",
  STREAK: "Seri",
  DUEL: "Düello",
  PROGRESS: "İlerleme",
  SPECIAL: "Özel",
};

export default function AchievementsPage() {
  const { summary } = useSession();
  const [rows, setRows] = useState<AchievementRow[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!summary) return;
    void (async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(summary.user.username)}`, {
        cache: "no-store",
      });
      if (res.ok) setRows((await res.json()).profile.achievements);
    })();
  }, [summary]);

  const categories = useMemo(
    () => ["ALL", ...Object.keys(CATEGORY_LABELS)],
    [],
  );

  if (!rows) return <PageLoader />;

  const unlocked = rows.filter((r) => r.unlocked).length;
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.category === filter);

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#FEF3C7 0%,#FFFBEB 50%,#EEF4FF 100%)" }}
        >
          <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">Başarımlar</h1>
          <p className="mt-1 text-sm text-ink-600">
            Oyun oynadıkça, düello kazandıkça ve seviye atladıkça yeni rozetler açılır.
          </p>
          <div className="mt-4 max-w-sm">
            <ProgressBar value={unlocked} max={rows.length} gradient="linear-gradient(90deg,#FFD75E,#F59E0B)" />
            <p className="mt-2 text-sm font-bold text-ink-600">
              {unlocked} / {rows.length} başarım açıldı
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              filter === c
                ? "border-brand-400 bg-brand-500 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
            )}
          >
            {c === "ALL" ? "Tümü" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <Card>
        <SectionTitle title={filter === "ALL" ? "Tüm başarımlar" : CATEGORY_LABELS[filter]} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => (
            <div
              key={a.key}
              className={cn(
                "flex gap-3 rounded-2xl border p-4 transition",
                a.unlocked ? "border-sun-200 bg-sun-50/70" : "border-ink-100 bg-white",
              )}
            >
              <IconTile name={a.iconKey} tier={a.tier} size={52} muted={!a.unlocked} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-extrabold text-ink-900">{a.name}</p>
                  {!a.unlocked && <Lock size={13} className="shrink-0 text-ink-300" />}
                </div>
                <p className="mt-0.5 text-xs text-ink-400">{a.description}</p>
                {a.target > 1 && (
                  <>
                    <ProgressBar
                      className="mt-2"
                      height={7}
                      value={a.progress}
                      max={a.target}
                      gradient={
                        a.unlocked
                          ? "linear-gradient(90deg,#FFD75E,#F59E0B)"
                          : "linear-gradient(90deg,#BCD3FF,#5B8FFB)"
                      }
                    />
                    <p className="mt-1 text-[11px] font-bold text-ink-400">
                      {Math.min(a.progress, a.target)} / {a.target}
                    </p>
                  </>
                )}
                {a.unlocked && a.target <= 1 && (
                  <Badge tone="sun" className="mt-2">
                    Açıldı
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
