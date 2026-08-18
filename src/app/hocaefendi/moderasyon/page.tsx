"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldBan, Trash2, Unlock } from "lucide-react";

import { Badge, Button, Card, EmptyState, Field, PageLoader, SectionTitle } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  normalized: string;
  createdAt: number;
}
interface Reserved {
  id: string;
  usernameLower: string;
  reason: string;
  createdAt: number;
}

export default function ModerationPage() {
  const [data, setData] = useState<{ bannedWords: Word[]; reserved: Reserved[] } | null>(null);
  const [newWord, setNewWord] = useState("");
  const [newReserved, setNewReserved] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/moderation", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) setMsg({ tone: "err", text: json.error ?? "İşlem başarısız." });
      else {
        setMsg({ tone: "ok", text: "İşlem tamamlandı." });
        setNewWord("");
        setNewReserved("");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <PageLoader />;

  return (
    <div className="space-y-5">
      <Card className="border-sun-200 bg-sun-50">
        <p className="flex items-start gap-2 text-sm font-semibold text-sun-600">
          <ShieldBan size={18} className="mt-0.5 shrink-0" />
          <span>
            Yasaklı kelime listesi öğrencilere <strong>asla gösterilmez</strong>. Uygunsuz bir ad
            denendiğinde öğrenci sadece &quot;Bu kullanıcı adı uygun değil.&quot; uyarısını görür.
            Filtre büyük/küçük harf, Türkçe karakter, rakam-harf benzerlikleri (0→o, 1→i, 3→e),
            Kiril/Yunan benzeri karakterler ve harf tekrarlarına karşı korumalıdır.
          </span>
        </p>
      </Card>

      {msg && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold",
            msg.tone === "ok"
              ? "border border-mint-200 bg-mint-100/60 text-mint-600"
              : "border border-coral-100 bg-coral-100/60 text-coral-600",
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Yasaklı Kelimeler" subtitle={`${data.bannedWords.length} kayıt`} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Field
                placeholder="Yeni kelime ekle..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
              />
            </div>
            <Button
              loading={busy === "add"}
              disabled={newWord.trim().length < 2}
              onClick={() => post({ action: "addWord", word: newWord.trim() }, "add")}
              icon={<Plus size={17} />}
            >
              Ekle
            </Button>
          </div>

          <div className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {data.bannedWords.map((w) => (
              <div key={w.id} className="flex items-center gap-2 rounded-2xl border border-ink-100 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-800">{w.word}</span>
                  <span className="block text-[11px] text-ink-400">
                    normalize: {w.normalized} · {relativeTime(w.createdAt)}
                  </span>
                </span>
                <button
                  onClick={() => post({ action: "removeWord", id: w.id }, w.id)}
                  className="rounded-xl border border-coral-200 p-2 text-coral-500 transition hover:bg-coral-100"
                  aria-label="Sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {data.bannedWords.length === 0 && <EmptyState title="Liste boş" />}
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="Rezerve Kullanıcı Adları"
            subtitle="Bu adlar bir daha kullanılamaz"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <Field
                placeholder="Kullanıcı adını rezerve et..."
                value={newReserved}
                onChange={(e) => setNewReserved(e.target.value)}
              />
            </div>
            <Button
              loading={busy === "reserve"}
              disabled={newReserved.trim().length < 3}
              onClick={() => post({ action: "reserveUsername", username: newReserved.trim() }, "reserve")}
              icon={<Plus size={17} />}
            >
              Ekle
            </Button>
          </div>

          <div className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {data.reserved.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-2xl border border-ink-100 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-800">{r.usernameLower}</span>
                  <span className="block text-[11px] text-ink-400">
                    {r.reason === "MODERATION" ? "Moderasyon sonucu" : "Manuel"} · {relativeTime(r.createdAt)}
                  </span>
                </span>
                <Badge tone="neutral">{r.reason}</Badge>
                <button
                  onClick={() => post({ action: "releaseUsername", id: r.id }, r.id)}
                  className="rounded-xl border border-mint-200 p-2 text-mint-600 transition hover:bg-mint-100"
                  aria-label="Serbest bırak"
                >
                  <Unlock size={15} />
                </button>
              </div>
            ))}
            {data.reserved.length === 0 && <EmptyState title="Rezerve ad yok" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
