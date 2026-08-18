"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EyeOff, Flame, Swords, Trophy, UserPlus } from "lucide-react";

import { Badge, Button, Card, EmptyState, PageLoader, ProgressBar, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { IconTile } from "@/components/visuals/Icon";
import { cn, formatNumber, relativeTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";
import { SHOP_BY_KEY } from "@/lib/catalog/shop";

interface ProfileData {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  titleKey: string | null;
  roleKey: string;
  isSelf: boolean;
  online: boolean;
  memberSince: number;
  level: number;
  xpCurrent: number;
  xpRequired: number;
  totalPoints: number;
  coins: number;
  statsHidden: boolean;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
  duelStreak: number;
  bestDuelStreak: number;
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  bestTimeBonus: number;
  perfectGames: number;
  bestAnswerStreak: number;
  achievements: Array<{
    key: string;
    name: string;
    description: string;
    iconKey: string;
    tier: string;
    unlocked: boolean;
  }>;
  records: Array<{
    gameKey: string;
    gameName: string;
    iconKey: string;
    variantLabel: string;
    bestScore: number;
    bestCorrect: number;
    playCount: number;
  }>;
  recentGames: Array<{
    gameKey: string;
    gameName: string;
    score: number;
    correct: number;
    wrong: number;
    createdAt: number;
    isPerfect: boolean;
  }>;
}

export function ProfileView({ username }: { username: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [friendship, setFriendship] = useState<{ status: string; requestId: string | null; incoming: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { cache: "no-store" });
    if (!res.ok) {
      setError((await res.json()).error ?? "Profil bulunamadı.");
      return;
    }
    const data = await res.json();
    setProfile(data.profile);
    setFriendship(data.friendship);
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFriend = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", username: profile.username }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (error) return <EmptyState title="Profil bulunamadı" description={error} />;
  if (!profile) return <PageLoader />;

  const unlocked = profile.achievements.filter((a) => a.unlocked);
  const title = profile.titleKey ? SHOP_BY_KEY[profile.titleKey]?.assetKey : null;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- ÜST */}
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#EEF4FF 0%,#F7FAFF 45%,#FFF8E9 100%)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                avatarKey={profile.avatarKey}
                frameKey={profile.frameKey}
                size={80}
                online={profile.roleKey === ROLE.HOCAEFENDI && !profile.isSelf ? undefined : profile.online}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-ink-900">{profile.username}</h1>
                  {profile.roleKey === ROLE.HOCAEFENDI && <Badge tone="sun">Hocaefendi</Badge>}
                  {title && <Badge tone="grape">{title}</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-ink-500">
                  Level {profile.level} · {relativeTime(profile.memberSince)} katıldı
                </p>
                <div className="mt-2 w-56">
                  <ProgressBar
                    value={profile.xpCurrent}
                    max={profile.xpRequired}
                    height={8}
                    gradient="linear-gradient(90deg,#FFD75E,#F59E0B)"
                  />
                  <p className="mt-1 text-xs font-bold text-ink-400">
                    {formatNumber(profile.xpCurrent)} / {formatNumber(profile.xpRequired)} XP
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!profile.isSelf && friendship?.status === "NONE" && (
                <Button loading={busy} onClick={addFriend} icon={<UserPlus size={17} />}>
                  Arkadaş ekle
                </Button>
              )}
              {!profile.isSelf && friendship?.status === "PENDING" && (
                <Badge tone="neutral">İstek bekliyor</Badge>
              )}
              {!profile.isSelf && friendship?.status === "ACCEPTED" && <Badge tone="mint">Arkadaşsınız</Badge>}
              {!profile.isSelf && (
                <Link href="/duello">
                  <Button variant="secondary" icon={<Swords size={17} />}>
                    Düelloya davet et
                  </Button>
                </Link>
              )}
              {profile.isSelf && (
                <Link href="/ayarlar">
                  <Button variant="secondary">Profili düzenle</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------------- SAYAÇ */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Puan"
          value={profile.statsHidden ? "Gizli" : formatNumber(profile.totalPoints)}
          icon={<Trophy size={20} />}
          tone="mint"
          hidden={profile.statsHidden}
        />
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-400">Lig</p>
              <p className="mt-1 text-xl font-black text-ink-900">
                {profile.statsHidden ? "Gizli" : profile.leagueName}
              </p>
              {!profile.statsHidden && (
                <p className="text-xs font-bold text-ink-400">
                  {formatNumber(profile.leaguePoints)} lig puanı
                </p>
              )}
            </div>
            {profile.statsHidden ? (
              <EyeOff size={28} className="text-ink-300" />
            ) : (
              <LeagueBadge leagueKey={profile.leagueKey} size={42} />
            )}
          </div>
        </div>
        <StatCard
          label="Düello Galibiyeti"
          value={String(profile.duelWins)}
          icon={<Swords size={20} />}
          tone="brand"
          sub={`${profile.duelLosses} mağlubiyet · ${profile.duelDraws} beraberlik`}
        />
        <StatCard
          label="Düello Serisi"
          value={String(profile.duelStreak)}
          icon={<Flame size={20} />}
          tone="coral"
          sub={`En uzun seri: ${profile.bestDuelStreak}`}
        />
      </div>

      {profile.roleKey === ROLE.HOCAEFENDI && (
        <Card className="border-sun-200 bg-sun-50">
          <p className="text-sm font-semibold text-sun-600">
            Hocaefendi hesapları global puan ve lig sıralamalarında görünmez.
            {profile.statsHidden && " Bu hesap puan ve lig bilgilerini gizlemeyi tercih etmiş."}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------- İSTATİSTİK */}
        <Card>
          <SectionTitle title="Oyun İstatistikleri" />
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Oynanan oyun" value={profile.gamesPlayed} />
            <MiniStat label="Doğruluk" value={`%${profile.accuracy}`} />
            <MiniStat label="Doğru cevap" value={profile.totalCorrect} />
            <MiniStat label="Yanlış cevap" value={profile.totalWrong} />
            <MiniStat label="Hatasız oyun" value={profile.perfectGames} />
            <MiniStat label="En uzun doğru serisi" value={profile.bestAnswerStreak} />
            <MiniStat label="En yüksek süre bonusu" value={`+${profile.bestTimeBonus}`} />
            {profile.isSelf && <MiniStat label="Jeton" value={formatNumber(profile.coins)} />}
          </div>
        </Card>

        {/* ---------------------------------------------------- REKORLAR */}
        <Card>
          <SectionTitle title="Rekorlar" subtitle="Her oyun için en iyi skorun" />
          {profile.records.length === 0 ? (
            <EmptyState title="Henüz rekor yok" description="Bir oyun oyna ve ilk rekorunu kır." />
          ) : (
            <div className="space-y-2">
              {profile.records.slice(0, 8).map((r) => (
                <div
                  key={`${r.gameKey}-${r.variantLabel}`}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3"
                >
                  <IconTile name={r.iconKey} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-800">{r.gameName}</p>
                    <p className="text-xs text-ink-400">
                      {r.variantLabel} · {r.playCount} kez oynandı
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1.5 text-sm font-black text-sun-600">
                    <Trophy size={14} /> {formatNumber(r.bestScore)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* -------------------------------------------------- BAŞARIMLAR */}
      <Card>
        <SectionTitle
          title="Başarımlar"
          subtitle={`${unlocked.length} / ${profile.achievements.length} açıldı`}
          action={
            profile.isSelf ? (
              <Link href="/basarimlar" className="text-sm font-bold text-brand-600 hover:underline">
                Tümü
              </Link>
            ) : undefined
          }
        />
        {unlocked.length === 0 ? (
          <EmptyState title="Henüz başarım kazanılmamış" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {unlocked.slice(0, 10).map((a) => (
              <div
                key={a.key}
                className="flex flex-col items-center gap-2 rounded-2xl border border-sun-200 bg-sun-50/70 p-3 text-center"
              >
                <IconTile name={a.iconKey} tier={a.tier} size={46} />
                <p className="text-xs font-extrabold text-ink-800">{a.name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------- SON OYUNLAR */}
      {profile.recentGames.length > 0 && (
        <Card>
          <SectionTitle title="Son oyunlar" />
          <div className="space-y-2">
            {profile.recentGames.map((g, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <IconTile name="game" size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-800">{g.gameName}</p>
                  <p className="text-xs text-ink-400">{relativeTime(g.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="rounded-full bg-mint-100 px-2 py-1 text-mint-600">{g.correct} doğru</span>
                  <span className="rounded-full bg-coral-100 px-2 py-1 text-coral-600">{g.wrong} yanlış</span>
                  <span className="rounded-full bg-ink-800 px-2.5 py-1 text-white">{g.score}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  sub,
  hidden,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "brand" | "mint" | "coral";
  sub?: string;
  hidden?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "from-brand-100 to-brand-200 text-brand-700",
    mint: "from-mint-100 to-mint-200 text-mint-600",
    coral: "from-coral-100 to-coral-400 text-white",
  };
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-ink-400">{label}</p>
          <p className={cn("mt-1 text-2xl font-black text-ink-900", hidden && "text-ink-300")}>{value}</p>
          {sub && <p className="text-xs font-bold text-ink-400">{sub}</p>}
        </div>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br", tones[tone])}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
      <p className="text-[11px] font-bold uppercase text-ink-400">{label}</p>
      <p className="mt-0.5 text-lg font-black text-ink-900">{value}</p>
    </div>
  );
}
