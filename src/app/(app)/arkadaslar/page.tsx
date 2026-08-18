"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Search, Swords, UserMinus, UserPlus, X } from "lucide-react";

import { Badge, Button, Card, EmptyState, Field, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { useSession } from "@/components/app/SessionProvider";
import { relativeTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";

interface Card2 {
  id: string;
  username: string;
  avatarKey: string;
  frameKey: string;
  roleKey: string;
  level: number;
  leagueName: string;
  totalPoints: number;
  online: boolean;
}
interface Request {
  id: string;
  userId: string;
  username: string;
  avatarKey: string;
  frameKey?: string;
  roleKey: string;
  createdAt: number;
}

export default function FriendsPage() {
  const { refresh, onEvent } = useSession();
  const [data, setData] = useState<{
    friends: Card2[];
    incoming: Request[];
    outgoing: Request[];
    online: Card2[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card2[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onEvent((e) => {
    if (e.type === "presence" || e.type === "notification") void load();
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

  const post = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) setMessage({ tone: "err", text: json.error ?? "İşlem başarısız." });
      else {
        setMessage({ tone: "ok", text: "İşlem tamamlandı." });
        await load();
        void refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <PageLoader />;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Arkadaş bul" subtitle="Kullanıcı adıyla ara ve istek gönder" />
        <Field
          placeholder="En az 2 harf yaz..."
          icon={<Search size={18} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {message && (
          <p
            className={`mt-3 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
              message.tone === "ok"
                ? "border border-mint-200 bg-mint-100/60 text-mint-600"
                : "border border-coral-100 bg-coral-100/60 text-coral-600"
            }`}
          >
            {message.text}
          </p>
        )}
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <Avatar avatarKey={u.avatarKey} frameKey={u.frameKey} size={42} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profil/${encodeURIComponent(u.username)}`}
                    className="truncate font-bold text-ink-800 hover:underline"
                  >
                    {u.username}
                  </Link>
                  {u.roleKey === ROLE.HOCAEFENDI && <Badge tone="sun" className="ml-2">Hocaefendi</Badge>}
                  <p className="text-xs text-ink-400">
                    Level {u.level} · {u.leagueName}
                  </p>
                </div>
                <Button
                  size="sm"
                  loading={busy === u.username}
                  onClick={() => post({ action: "request", username: u.username }, u.username)}
                  icon={<UserPlus size={15} />}
                >
                  Ekle
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.incoming.length > 0 && (
        <Card>
          <SectionTitle title="Gelen istekler" />
          <div className="space-y-2">
            {data.incoming.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <Avatar avatarKey={r.avatarKey} frameKey={r.frameKey} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-800">{r.username}</p>
                  <p className="text-xs text-ink-400">{relativeTime(r.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  loading={busy === r.id}
                  onClick={() => post({ action: "accept", requestId: r.id }, r.id)}
                  icon={<Check size={15} />}
                >
                  Kabul
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => post({ action: "decline", requestId: r.id }, r.id)}
                  icon={<X size={15} />}
                >
                  Reddet
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle title="Arkadaşların" subtitle={`${data.friends.length} kişi`} />
        {data.friends.length === 0 ? (
          <EmptyState title="Henüz arkadaşın yok" description="Yukarıdan kullanıcı adıyla arama yapabilirsin." />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
                <Avatar avatarKey={f.avatarKey} frameKey={f.frameKey} size={44} online={f.online} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profil/${encodeURIComponent(f.username)}`}
                    className="truncate font-bold text-ink-800 hover:underline"
                  >
                    {f.username}
                  </Link>
                  <p className="text-xs text-ink-400">
                    Level {f.level} · {f.leagueName} · {f.totalPoints} puan
                  </p>
                </div>
                <Link href={`/duello`}>
                  <Button size="sm" variant="secondary" icon={<Swords size={15} />}>
                    Düello
                  </Button>
                </Link>
                <button
                  onClick={() => post({ action: "remove", userId: f.id }, f.id)}
                  className="rounded-xl p-2 text-ink-300 transition hover:bg-coral-100 hover:text-coral-600"
                  aria-label="Arkadaşlıktan çıkar"
                >
                  <UserMinus size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle title="Şu an çevrimiçi" subtitle="Aktif öğrenciler" />
        {data.online.length === 0 ? (
          <EmptyState title="Şu anda kimse çevrimiçi değil" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.online.map((u) => (
              <Link
                key={u.id}
                href={`/profil/${encodeURIComponent(u.username)}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-100/50 px-3 py-2 transition hover:bg-mint-100"
              >
                <Avatar avatarKey={u.avatarKey} size={26} online />
                <span className="text-sm font-bold text-ink-700">{u.username}</span>
                <span className="text-xs font-semibold text-ink-400">Lv{u.level}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {data.outgoing.length > 0 && (
        <Card>
          <SectionTitle title="Gönderdiğin istekler" />
          <div className="flex flex-wrap gap-2">
            {data.outgoing.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 px-3 py-2">
                <Avatar avatarKey={r.avatarKey} size={24} />
                <span className="text-sm font-bold text-ink-700">{r.username}</span>
                <Badge tone="neutral">Bekliyor</Badge>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
