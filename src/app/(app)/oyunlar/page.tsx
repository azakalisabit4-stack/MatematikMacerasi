"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock, Timer, Trophy } from "lucide-react";

import { Badge, Card, PageLoader, SectionTitle } from "@/components/ui";
import { IconTile, MMIcon } from "@/components/visuals/Icon";
import { CloudShape } from "@/components/visuals/Scenes";
import { cn, formatNumber } from "@/lib/utils";

interface GameRow {
  key: string;
  name: string;
  shortName: string;
  description: string;
  iconKey: string;
  region: string;
  durationSec: number;
  questionCount: number;
  theme: { from: string; to: string; accent: string };
  minLevel: number;
  locked: boolean;
  record: number;
  variants: Array<{ key: string; label: string }>;
}

interface RegionRow {
  key: string;
  name: string;
  subtitle: string;
  iconKey: string;
  games: string[];
  unlockLevel: number;
  colors: [string, string];
}

export default function GamesMapPage() {
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/games", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games);
        setRegions(data.regions);
        setLevel(data.level);
      }
    })();
  }, []);

  if (!games) return <PageLoader label="Harita yükleniyor..." />;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(120deg,#E0F2FE 0%,#F5F9FF 50%,#FFF7E6 100%)" }}
        />
        <CloudShape className="absolute -left-8 top-2 w-40 opacity-70" />
        <CloudShape className="absolute right-8 top-16 w-24 opacity-50" />
        <div className="relative p-5 sm:p-7">
          <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
            Matematik Haritası
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-500">
            Başlangıç Çayırı&apos;ndan Boss Zirvesi&apos;ne kadar uzanan macerada ilerle. Yeni bölgeler
            seviye atladıkça açılır.
          </p>
          <Badge tone="brand" className="mt-3">
            Şu anki seviyen: {level}
          </Badge>
        </div>
      </Card>

      <div className="relative">
        {/* patika çizgisi */}
        <div className="absolute left-[27px] top-6 hidden h-[calc(100%-3rem)] w-1 rounded-full bg-gradient-to-b from-brand-200 via-mint-200 to-sun-200 sm:block" />

        <div className="space-y-5">
          {regions.map((region, idx) => {
            const regionGames = games.filter((g) => region.games.includes(g.key));
            const unlocked = level >= region.unlockLevel;
            return (
              <div key={region.key} className="relative sm:pl-16">
                {/* patika düğümü */}
                <span
                  className="absolute left-0 top-5 hidden h-14 w-14 items-center justify-center rounded-2xl border-4 border-white shadow-md sm:flex"
                  style={{
                    background: `linear-gradient(140deg, ${region.colors[0]}, ${region.colors[1]})`,
                  }}
                >
                  <MMIcon name={region.iconKey} size={24} className="text-white" strokeWidth={2.4} />
                </span>

                <Card className={cn(!unlocked && "opacity-70")}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-white sm:hidden"
                        style={{
                          background: `linear-gradient(140deg, ${region.colors[0]}, ${region.colors[1]})`,
                        }}
                      >
                        <MMIcon name={region.iconKey} size={20} strokeWidth={2.4} />
                      </span>
                      <div>
                        <h2 className="text-lg font-extrabold text-ink-900">
                          {idx + 1}. {region.name}
                        </h2>
                        <p className="text-sm text-ink-400">{region.subtitle}</p>
                      </div>
                    </div>
                    {!unlocked ? (
                      <Badge tone="neutral">
                        <Lock size={12} /> Level {region.unlockLevel}
                      </Badge>
                    ) : regionGames.some((g) => g.record > 0) ? (
                      <Badge tone="mint">Keşfedildi</Badge>
                    ) : regionGames.length > 0 ? (
                      <Badge tone="sun">Yeni bölge</Badge>
                    ) : null}
                  </div>

                  {regionGames.length === 0 ? (
                    <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
                      {region.key === "sampiyonlar"
                        ? "Düello arenası ve global sıralamalar burada. Sıralamalar sayfasından takip et."
                        : "Maceraya buradan başlıyorsun. İlk bölgeye geç!"}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {regionGames.map((g) => (
                        <GameCard key={g.key} game={g} disabled={!unlocked || g.locked} />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <SectionTitle title="Tüm oyunlar" subtitle="Bölgeden bağımsız hızlı erişim" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((g) => (
            <GameCard key={g.key} game={g} disabled={g.locked} compact />
          ))}
        </div>
      </Card>
    </div>
  );
}

function GameCard({
  game,
  disabled,
  compact,
}: {
  game: GameRow;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white p-4 transition",
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: `linear-gradient(90deg, ${game.theme.from}, ${game.theme.accent})` }}
      />
      <div className="flex items-start gap-3">
        <IconTile
          name={game.iconKey}
          size={46}
          colors={{ from: game.theme.from, to: game.theme.to, accent: game.theme.accent }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-ink-900">{game.shortName}</p>
          {!compact && <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{game.description}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-1">
          <Timer size={12} /> {game.durationSec}s
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-1">
          {game.questionCount} soru
        </span>
        {game.record > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2 py-1 text-sun-600">
            <Trophy size={12} /> {formatNumber(game.record)}
          </span>
        )}
        {disabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1">
            <Lock size={12} /> Level {game.minLevel}
          </span>
        )}
      </div>
    </div>
  );

  if (disabled) return inner;
  return <Link href={`/oyna/${game.key}`}>{inner}</Link>;
}
