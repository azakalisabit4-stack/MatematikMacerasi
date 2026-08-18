"use client";

import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Star, Swords, Trophy } from "lucide-react";

import { useSession } from "@/components/app/SessionProvider";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { IconTile, MMIcon } from "@/components/visuals/Icon";
import { Badge, Card, PageLoader, ProgressBar, SectionTitle } from "@/components/ui";
import { CloudShape } from "@/components/visuals/Scenes";
import { formatNumber } from "@/lib/utils";
import { GAMES } from "@/lib/constants";

const QUICK = [
  { key: "ritmik-ileri-1", label: "Toplama", icon: "plus", from: "#86EFAC", to: "#22C55E" },
  { key: "ritmik-geri-1", label: "Çıkarma", icon: "minus", from: "#FDBA74", to: "#F97316" },
  { key: "carpim-tablosu", label: "Çarpma", icon: "multiply", from: "#C4B5FD", to: "#8B5CF6" },
  { key: "hizli-islem", label: "Hızlı İşlem", icon: "bolt", from: "#FDE68A", to: "#F59E0B" },
];

export default function DashboardPage() {
  const { summary } = useSession();
  if (!summary) return <PageLoader />;

  const p = summary.progress;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ KARŞILAMA */}
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(120deg,#EEF4FF 0%,#F7FAFF 45%,#FFF8E9 100%)" }}
        />
        <CloudShape className="absolute -right-6 -top-6 w-40 opacity-70" />
        <CloudShape className="absolute right-24 top-14 w-24 opacity-50" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar avatarKey={summary.user.avatarKey} frameKey={summary.user.frameKey} size={64} online />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-[26px]">
                Merhaba {summary.user.username}
              </h1>
              <p className="text-sm text-ink-500">Bugün yeni maceralara hazır mısın?</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/oyunlar"
              className="inline-flex items-center gap-2 rounded-2xl bg-ink-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-700"
            >
              <Sparkles size={17} /> Haritayı Aç
            </Link>
            <Link
              href="/duello"
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
            >
              <Swords size={17} /> Düello Yap
              {summary.duelInvites > 0 && (
                <span className="rounded-full bg-coral-500 px-1.5 text-[11px] font-black text-white">
                  {summary.duelInvites}
                </span>
              )}
            </Link>
          </div>
        </div>
      </Card>

      {/* --------------------------------------------------------- SAYAÇLAR */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Seviye</p>
              <p className="mt-1 text-3xl font-black text-ink-900">Level {p.level}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-200 to-sun-400 text-ink-900">
              <Star size={21} fill="currentColor" />
            </span>
          </div>
          <ProgressBar
            className="mt-4"
            value={p.xpCurrent}
            max={p.xpRequired}
            gradient="linear-gradient(90deg,#FFD75E,#F59E0B)"
          />
          <p className="mt-2 text-xs font-semibold text-ink-400">
            {formatNumber(p.xpCurrent)} / {formatNumber(p.xpRequired)} XP
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Lig</p>
              <p className="mt-1 text-2xl font-black text-ink-900">{p.leagueName}</p>
            </div>
            <LeagueBadge leagueKey={p.leagueKey} size={44} />
          </div>
          <ProgressBar
            className="mt-4"
            value={p.leaguePoints - p.leagueMin}
            max={(p.leagueMax ?? p.leaguePoints + 1) - p.leagueMin}
            gradient="linear-gradient(90deg,#8FB6FF,#3568F0)"
          />
          <p className="mt-2 text-xs font-semibold text-ink-400">
            {formatNumber(p.leaguePoints)} lig puanı
            {summary.ranks.leagueRank ? ` · #${summary.ranks.leagueRank}` : ""}
          </p>
          <Link href="/lig" className="mt-1 inline-block text-xs font-bold text-brand-600 hover:underline">
            Lig detayları
          </Link>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Toplam Puan</p>
              <p className="mt-1 text-3xl font-black text-ink-900">{formatNumber(p.totalPoints)}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-200 to-mint-400 text-mint-600">
              <Trophy size={21} />
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold text-ink-400">
            {summary.ranks.pointsRank
              ? `Puan sıralamasında #${summary.ranks.pointsRank} / ${summary.ranks.totalStudents}`
              : "Sıralamaya dahil değilsin"}
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Düello Serisi</p>
              <p className="mt-1 text-3xl font-black text-ink-900">{p.duelStreak}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-100 to-coral-400 text-white">
              <Flame size={21} />
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold text-ink-400">
            {p.duelWins} galibiyet · en uzun seri {p.bestDuelStreak}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* ------------------------------------------------------ GÖREVLER */}
        <Card>
          <SectionTitle
            title="Bugünkü Görevler"
            subtitle="Her gece yenilenir"
            action={
              <Link href="/gorevler" className="text-sm font-bold text-brand-600 hover:underline">
                Tümü
              </Link>
            }
          />
          <div className="space-y-2.5">
            {summary.tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3"
              >
                <IconTile name={t.iconKey} tier={t.completed ? "gold" : "neutral"} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink-800">{t.title}</p>
                    <span className="shrink-0 text-xs font-black text-mint-600">
                      +{t.rewardXp} XP
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    height={8}
                    value={t.progress}
                    max={t.target}
                    gradient={
                      t.completed
                        ? "linear-gradient(90deg,#34D399,#059669)"
                        : "linear-gradient(90deg,#8FB6FF,#3568F0)"
                    }
                  />
                  <p className="mt-1 text-[11px] font-semibold text-ink-400">
                    {t.progress} / {t.target}
                    {t.completed && " · tamamlandı"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ----------------------------------------------------- ARKADAŞLAR */}
        <Card>
          <SectionTitle
            title="Arkadaşların"
            action={
              <Link href="/arkadaslar" className="text-sm font-bold text-brand-600 hover:underline">
                Tümü
              </Link>
            }
          />
          {summary.friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 p-5 text-center">
              <p className="text-sm font-semibold text-ink-600">Henüz arkadaşın yok</p>
              <p className="mt-1 text-xs text-ink-400">
                Kullanıcı adıyla arayıp arkadaşlık isteği gönderebilirsin.
              </p>
              <Link
                href="/arkadaslar"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
              >
                Arkadaş bul <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {summary.friends.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/profil/${encodeURIComponent(f.username)}`}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-ink-50"
                  >
                    <Avatar avatarKey={f.avatarKey} frameKey={f.frameKey} size={38} online={f.online} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-800">
                        {f.username}
                      </span>
                      <span className="block text-xs text-ink-400">
                        Level {f.level} · {f.leagueName}
                      </span>
                    </span>
                    <Badge tone={f.online ? "mint" : "neutral"}>
                      {f.online ? "Çevrimiçi" : "Çevrimdışı"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {summary.onlineNow.length > 0 && (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-400">
                Şu an oynayanlar
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.onlineNow.slice(0, 8).map((u) => (
                  <Link
                    key={u.id}
                    href={`/profil/${encodeURIComponent(u.username)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-mint-200 bg-mint-100/60 px-2.5 py-1.5"
                  >
                    <Avatar avatarKey={u.avatarKey} size={22} />
                    <span className="text-xs font-bold text-mint-600">{u.username}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* --------------------------------------------------------- HIZLI OYNA */}
      <Card>
        <SectionTitle title="Hızlı Oyna" subtitle="Tek dokunuşla başla" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          {QUICK.map((q) => {
            const game = GAMES.find((g) => g.key === q.key);
            return (
              <Link
                key={q.key}
                href={`/oyna/${q.key}`}
                className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl p-4 text-center shadow-[0_10px_24px_-14px_rgba(26,37,64,0.5)] transition hover:-translate-y-0.5"
                style={{ background: `linear-gradient(150deg, ${q.from}, ${q.to})` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/35 text-white">
                  <MMIcon name={q.icon} size={26} strokeWidth={2.6} />
                </span>
                <span className="text-sm font-black text-white drop-shadow-sm">{q.label}</span>
                <span className="text-[11px] font-semibold text-white/85">
                  {game?.durationSec}s · {game?.questionCount} soru
                </span>
              </Link>
            );
          })}
          <Link
            href="/duello"
            className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl p-4 text-center shadow-[0_10px_24px_-14px_rgba(26,37,64,0.5)] transition hover:-translate-y-0.5"
            style={{ background: "linear-gradient(150deg,#FCA5A5,#DC2626)" }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/35 text-white">
              <Swords size={26} strokeWidth={2.4} />
            </span>
            <span className="text-sm font-black text-white drop-shadow-sm">Düello</span>
            <span className="text-[11px] font-semibold text-white/85">Lig puanı kazan</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
