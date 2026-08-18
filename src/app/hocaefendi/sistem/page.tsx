"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button, Card, Field, PageLoader, SectionTitle } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

interface Setting {
  key: string;
  value: string;
  updatedAt: number;
}

const LABELS: Record<string, { title: string; hint: string; editable: boolean }> = {
  site_name: { title: "Site adı", hint: "Uygulama başlığı", editable: true },
  duel_enabled: { title: "Düellolar açık", hint: "true / false", editable: true },
  registration_open: { title: "Kayıtlar açık", hint: "true / false", editable: true },
  duel_invite_ttl_sec: { title: "Düello davet süresi (sn)", hint: "Varsayılan 180", editable: true },
  bootstrap_version: { title: "Kurulum sürümü", hint: "Sistem tarafından yönetilir", editable: false },
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/system", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setDraft(Object.fromEntries(data.settings.map((s: Setting) => [s.key, s.value])));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (key: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: draft[key] ?? "" }),
      });
      const json = await res.json();
      if (!res.ok) setMsg({ tone: "err", text: json.error ?? "Kaydedilemedi." });
      else {
        setMsg({ tone: "ok", text: "Ayar kaydedildi." });
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  if (!settings) return <PageLoader />;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Sistem Ayarları" subtitle="Uygulama genelinde geçerli ayarlar" />
        {msg && (
          <div
            className={cn(
              "mb-4 rounded-2xl px-4 py-3 text-sm font-semibold",
              msg.tone === "ok"
                ? "border border-mint-200 bg-mint-100/60 text-mint-600"
                : "border border-coral-100 bg-coral-100/60 text-coral-600",
            )}
          >
            {msg.text}
          </div>
        )}
        <div className="space-y-3">
          {settings.map((s) => {
            const meta = LABELS[s.key] ?? { title: s.key, hint: "", editable: false };
            return (
              <div
                key={s.key}
                className="flex flex-col gap-3 rounded-2xl border border-ink-100 p-4 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Field
                    label={meta.title}
                    hint={`${meta.hint} · son güncelleme ${relativeTime(s.updatedAt)}`}
                    value={draft[s.key] ?? ""}
                    disabled={!meta.editable}
                    onChange={(e) => setDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                  />
                </div>
                {meta.editable && (
                  <Button loading={busy === s.key} onClick={() => save(s.key)} icon={<Save size={17} />}>
                    Kaydet
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-ink-100 bg-ink-50/40">
        <p className="text-sm text-ink-500">
          Güvenlik notu: Hocaefendi yetkileri arayüzde değil, sunucu tarafında doğrulanır. Öğrenci
          hesapları admin API uçlarına eriştiğinde 403 yanıtı alır. Oyun ve düello sonuçları
          istemciden değil, sunucudaki soru kayıtlarından hesaplanır.
        </p>
      </Card>
    </div>
  );
}
