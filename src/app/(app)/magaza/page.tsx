"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Coins, Lock } from "lucide-react";

import { Badge, Button, Card, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { useSession } from "@/components/app/SessionProvider";
import { cn, formatNumber } from "@/lib/utils";

interface Item {
  key: string;
  name: string;
  type: "AVATAR" | "FRAME" | "TITLE";
  price: number;
  minLevel: number;
  assetKey: string;
  owned: boolean;
  locked: boolean;
}

export default function ShopPage() {
  const { refresh } = useSession();
  const [data, setData] = useState<{
    coins: number;
    level: number;
    equipped: { avatarKey?: string; frameKey?: string; titleKey?: string | null };
    items: Item[];
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/shop", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: "buy" | "equip", itemKey: string) => {
    setBusy(itemKey);
    setError(null);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemKey }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "İşlem başarısız.");
      else {
        await load();
        void refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <PageLoader />;

  const groups: Array<{ type: Item["type"]; title: string; subtitle: string }> = [
    { type: "AVATAR", title: "Avatarlar", subtitle: "Karakterini değiştir" },
    { type: "FRAME", title: "Çerçeveler", subtitle: "Profil çerçeveni özelleştir" },
    { type: "TITLE", title: "Unvanlar", subtitle: "Adının yanında görünür" },
  ];

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#EDE9FE 0%,#F5F3FF 50%,#FFF7E6 100%)" }}
        >
          <div>
            <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">Mağaza</h1>
            <p className="mt-1 text-sm text-ink-600">
              Oyunlardan ve görevlerden kazandığın jetonlarla yeni görünümler aç.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <Coins size={20} className="text-sun-500" />
            <span className="text-xl font-black text-ink-900">{formatNumber(data.coins)}</span>
            <span className="text-sm font-bold text-ink-400">jeton</span>
          </span>
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </div>
      )}

      {groups.map((g) => (
        <Card key={g.type}>
          <SectionTitle title={g.title} subtitle={g.subtitle} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {data.items
              .filter((i) => i.type === g.type)
              .map((item) => {
                const equipped =
                  (g.type === "AVATAR" && data.equipped.avatarKey === item.key) ||
                  (g.type === "FRAME" && data.equipped.frameKey === item.key) ||
                  (g.type === "TITLE" && data.equipped.titleKey === item.key);
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition",
                      equipped ? "border-brand-400 bg-brand-50" : "border-ink-100 bg-white",
                      item.locked && "opacity-60",
                    )}
                  >
                    {g.type === "TITLE" ? (
                      <span className="flex h-14 items-center rounded-2xl bg-gradient-to-br from-grape-100 to-grape-300 px-3 text-sm font-black text-grape-600">
                        {item.assetKey}
                      </span>
                    ) : (
                      <Avatar
                        avatarKey={g.type === "AVATAR" ? item.key : data.equipped.avatarKey}
                        frameKey={g.type === "FRAME" ? item.key : "frame-none"}
                        size={64}
                      />
                    )}
                    <p className="text-sm font-extrabold text-ink-900">{item.name}</p>
                    {item.locked ? (
                      <Badge tone="neutral">
                        <Lock size={11} /> Level {item.minLevel}
                      </Badge>
                    ) : equipped ? (
                      <Badge tone="brand">
                        <Check size={11} /> Kullanılıyor
                      </Badge>
                    ) : item.owned ? (
                      <Button size="sm" variant="secondary" loading={busy === item.key} onClick={() => act("equip", item.key)}>
                        Kullan
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        loading={busy === item.key}
                        onClick={() => act("buy", item.key)}
                        icon={<Coins size={14} />}
                      >
                        {formatNumber(item.price)}
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      ))}
    </div>
  );
}
