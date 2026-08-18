"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Flame, Search, Swords, Trophy, X } from "lucide-react";

import { Badge, Button, Card, EmptyState, Field, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { useSession } from "@/components/app/SessionProvider";
import { cn, relativeTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";

interface Invite {
  id: string;
  mode: string;
  username: string;
  avatarKey: string;
  frameKey?: string;
  roleKey: string;
  createdAt: number;
}

interface HistoryRow {
  id: string;
  mode: string;
  finishedAt: number | null;
  isDraw: boolean;
  won: boolean;
  myScore: number;
  rivalScore: number;
  delta: number;
  rival: { username: string; avatarKey: string; roleKey: string } | null;
}

interface UserCard {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  roleKey: string;
  level: number;
  leagueKey: string;
  leagueName: string;
  online: boolean;
}

export default function DuelLobbyPage() {
  const router = useRouter();
  const { summary, refresh, onEvent } = useSession();

  const [data, setData] = useState<{
    invites: Invite[];
    sent: Invite[];
    active: string | null;
    history: HistoryRow[];
    stats: {
      wins: number;
      losses: number;
      draws: number;
      streak: number;
      bestStreak: number;
      leagueKey: string;
      leagueName: string;
      leaguePoints: number;
    };
  } | null>(null);

  const [mode, setMode] = useState<"POINTS_SWAP" | "NO_SWAP">("POINTS_SWAP");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserCard[]>([]);
  const [friends, setFriends] = useState<UserCard[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [duelRes, friendRes] = await Promise.all([
      fetch("/api/duels", { cache: "no-store" }),
      fetch("/api/friends", { cache: "no-store" }),
    ]);
    if (duelRes.ok) setData(await duelRes.json());
    if (friendRes.ok) {
      const f = await friendRes.json();
      setFriends([...f.friends, ...f.online.filter((o: UserCard) => !f.friends.some((x: UserCard) => x.id === o.id))]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onEvent((e) => {
    if (e.type.startsWith("duel")) void load();
  }), [onEvent, load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (res.ok) setResults((await res.json()).results);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const challenge = async (opponent: string) => {
    setBusy(opponent);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent, mode }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Düello teklifi gönderilemedi.");
      else {
        setInfo("Düello teklifin gönderildi. Rakibin kabul etmesini bekle.");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const act = async (duelId: string, action: "accept" | "decline" | "cancel") => {
    setBusy(duelId);
    setError(null);
    try {
      const res = await fetch(`/api/duels/${duelId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "İşlem yapılamadı.");
        return;
      }
      if (action === "accept") router.push(`/duello/${duelId}`);
      else await load();
      void refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!data || !summary) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- ÜST KART */}
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#FFE4E6 0%,#FFF1F2 45%,#EEF4FF 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-ink-900 sm:text-3xl">
                <Swords size={26} /> Düello Arenası
              </h1>
              <p className="mt-1 max-w-lg text-sm text-ink-600">
                Düellolar lig puanını belirler. Tek kişilik oyunlardan kazandığın XP ve puan
                buradan etkilenmez.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Galibiyet" value={data.stats.wins} icon={<Trophy size={15} />} />
              <StatPill label="Seri" value={data.stats.streak} icon={<Flame size={15} />} />
              <StatPill label="Lig Puanı" value={data.stats.leaguePoints} icon={<LeagueBadge leagueKey={data.stats.leagueKey} size={15} />} />
            </div>
          </div>
        </div>
      </Card>

      {data.active && (
        <Card className="border-mint-300 bg-mint-100/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-mint-600">Devam eden bir düellon var!</p>
            <Link href={`/duello/${data.active}`}>
              <Button variant="success">Düelloya dön</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------- DAVETLER */}
      {data.invites.length > 0 && (
        <Card>
          <SectionTitle title="Gelen düello davetleri" />
          <div className="space-y-2.5">
            {data.invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3"
              >
                <Avatar avatarKey={inv.avatarKey} frameKey={inv.frameKey} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-800">
                    {inv.username}
                    {inv.roleKey === ROLE.HOCAEFENDI && (
                      <Badge tone="sun" className="ml-2">
                        Hocaefendi
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-ink-400">
                    {inv.mode === "POINTS_SWAP" ? "Puan takaslı" : "Takassız"} · {relativeTime(inv.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    loading={busy === inv.id}
                    onClick={() => act(inv.id, "accept")}
                    icon={<Check size={16} />}
                  >
                    Kabul et
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => act(inv.id, "decline")}
                    icon={<X size={16} />}
                  >
                    Reddet
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------- YENİ DÜELLO */}
      <Card>
        <SectionTitle title="Yeni düello" subtitle="Rakip seç ve düello türünü belirle" />

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setMode("POINTS_SWAP")}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition",
              mode === "POINTS_SWAP" ? "border-brand-400 bg-brand-50" : "border-ink-100 bg-white hover:border-brand-200",
            )}
          >
            <p className="font-extrabold text-ink-900">Puan Takaslı Düello</p>
            <p className="mt-1 text-xs text-ink-500">
              Kazanan lig puanı kazanır, kaybeden aynı miktarı kaybeder. Puan hiçbir zaman 0&apos;ın
              altına düşmez.
            </p>
          </button>
          <button
            onClick={() => setMode("NO_SWAP")}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition",
              mode === "NO_SWAP" ? "border-brand-400 bg-brand-50" : "border-ink-100 bg-white hover:border-brand-200",
            )}
          >
            <p className="font-extrabold text-ink-900">Takassız Düello</p>
            <p className="mt-1 text-xs text-ink-500">
              Lig puanları değişmez. Sadece kazandın/kaybettin sonucu gösterilir, istatistiklere
              işlenir.
            </p>
          </button>
        </div>

        <Field
          placeholder="Kullanıcı adıyla rakip ara..."
          icon={<Search size={18} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {info && (
          <p className="mt-3 rounded-2xl border border-mint-200 bg-mint-100/60 px-4 py-2.5 text-sm font-semibold text-mint-600">
            {info}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-2.5 text-sm font-semibold text-coral-600">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {(query.trim().length >= 2 ? results : friends).map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3">
              <Avatar avatarKey={u.avatarKey} frameKey={u.frameKey} size={42} online={u.roleKey === ROLE.HOCAEFENDI ? undefined : u.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink-800">
                  {u.username}
                  {u.roleKey === ROLE.HOCAEFENDI && (
                    <Badge tone="sun" className="ml-2">
                      Hocaefendi
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-ink-400">
                  Level {u.level} · {u.leagueName}
                </p>
              </div>
              <Button
                size="sm"
                loading={busy === u.username}
                onClick={() => challenge(u.username)}
                icon={<Swords size={15} />}
              >
                Meydan oku
              </Button>
            </div>
          ))}
          {(query.trim().length >= 2 ? results : friends).length === 0 && (
            <EmptyState
              title="Rakip bulunamadı"
              description="Kullanıcı adının en az 2 harfini yazarak arama yapabilirsin."
            />
          )}
        </div>
      </Card>

      {/* --------------------------------------------------- GÖNDERİLENLER */}
      {data.sent.length > 0 && (
        <Card>
          <SectionTitle title="Gönderdiğin davetler" />
          <div className="space-y-2">
            {data.sent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <Avatar avatarKey={s.avatarKey} size={38} />
                <div className="flex-1">
                  <p className="font-bold text-ink-800">{s.username}</p>
                  <p className="text-xs text-ink-400">Yanıt bekleniyor · {relativeTime(s.createdAt)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => act(s.id, "cancel")}>
                  İptal
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* --------------------------------------------------------- GEÇMİŞ */}
      <Card>
        <SectionTitle title="Düello geçmişi" />
        {data.history.length === 0 ? (
          <EmptyState title="Henüz düello yapmadın" description="İlk düellonu kazanarak lig puanı topla." />
        ) : (
          <div className="space-y-2">
            {data.history.map((h) => (
              <div
                key={h.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3",
                  h.isDraw
                    ? "border-ink-100 bg-white"
                    : h.won
                      ? "border-mint-200 bg-mint-100/40"
                      : "border-coral-100 bg-coral-100/30",
                )}
              >
                <Avatar avatarKey={h.rival?.avatarKey ?? "avatar-01"} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-800">{h.rival?.username ?? "—"}</p>
                  <p className="text-xs text-ink-400">
                    {h.mode === "POINTS_SWAP" ? "Puan takaslı" : "Takassız"}
                    {h.finishedAt ? ` · ${relativeTime(h.finishedAt)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-ink-900">
                    {h.myScore} - {h.rivalScore}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-black",
                      h.isDraw ? "text-ink-400" : h.won ? "text-mint-600" : "text-coral-600",
                    )}
                  >
                    {h.isDraw ? "Berabere" : h.won ? "Kazandın" : "Kaybettin"}
                    {h.delta !== 0 && ` · ${h.delta > 0 ? "+" : ""}${h.delta}`}
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

function StatPill({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur">
      <span className="text-ink-500">{icon}</span>
      <span className="text-sm font-bold text-ink-500">{label}</span>
      <span className="text-lg font-black text-ink-900">{value}</span>
    </span>
  );
}
