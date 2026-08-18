"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, LogOut, UserRound } from "lucide-react";

import { Button, Card, Field, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { useSession } from "@/components/app/SessionProvider";
import { ROLE } from "@/lib/constants";

export default function SettingsPage() {
  const router = useRouter();
  const { summary, refresh } = useSession();

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  if (!summary) return <PageLoader />;
  const isAdmin = summary.user.roleKey === ROLE.HOCAEFENDI;

  const patch = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) setMsg({ tone: "err", text: json.error ?? "İşlem başarısız." });
      else {
        setMsg({ tone: "ok", text: "Değişiklikler kaydedildi." });
        setUsername("");
        setCurrentPassword("");
        setNewPassword("");
        await refresh();
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/giris");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar avatarKey={summary.user.avatarKey} frameKey={summary.user.frameKey} size={72} />
          <div>
            <h1 className="text-2xl font-black text-ink-900">{summary.user.username}</h1>
            <p className="text-sm text-ink-400">
              Level {summary.progress.level} · {summary.progress.leagueName}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Avatar ve çerçeveni <strong>Mağaza</strong> sayfasından değiştirebilirsin.
            </p>
          </div>
        </div>
      </Card>

      {msg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            msg.tone === "ok"
              ? "border border-mint-200 bg-mint-100/60 text-mint-600"
              : "border border-coral-100 bg-coral-100/60 text-coral-600"
          }`}
        >
          {msg.text}
        </div>
      )}

      <Card>
        <SectionTitle title="Kullanıcı adı" subtitle="Uygunsuz adlar sistem tarafından engellenir" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Yeni kullanıcı adı"
              icon={<UserRound size={18} />}
              placeholder={summary.user.username}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <Button
            loading={busy === "username"}
            disabled={username.trim().length < 3}
            onClick={() => patch({ username: username.trim() }, "username")}
          >
            Güncelle
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Şifre" subtitle="Hesabını güvende tut" />
        <div className="space-y-3">
          <Field
            label="Mevcut şifre"
            type="password"
            icon={<KeyRound size={18} />}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Field
            label="Yeni şifre"
            type="password"
            icon={<KeyRound size={18} />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button
            loading={busy === "password"}
            disabled={newPassword.length < 6 || currentPassword.length < 1}
            onClick={() => patch({ currentPassword, newPassword }, "password")}
          >
            Şifreyi değiştir
          </Button>
        </div>
      </Card>

      {isAdmin ? (
        <Card>
          <SectionTitle
            title="Puan ve Lig Bilgilerimi Göster"
            subtitle="Açarsan öğrenciler profilinde puanını ve ligini görebilir. Global sıralamalarda yine de görünmezsin."
          />
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <Eye size={18} />
              {summary.user.showStatsPublicly ? "Açık" : "Kapalı"}
            </span>
            <Button
              variant={summary.user.showStatsPublicly ? "secondary" : "primary"}
              loading={busy === "visibility"}
              onClick={() =>
                patch({ showStatsPublicly: !summary.user.showStatsPublicly }, "visibility")
              }
            >
              {summary.user.showStatsPublicly ? "Gizle" : "Göster"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-ink-100 bg-ink-50/40">
          <p className="text-sm text-ink-500">
            Öğrenci hesaplarında puan ve lig bilgileri gizlenemez; bu bilgiler profiline giren
            diğer kullanıcılar tarafından görülebilir. E-posta adresin ise profilinde asla
            gösterilmez.
          </p>
        </Card>
      )}

      <Card>
        <SectionTitle title="Oturum" />
        <Button variant="danger" onClick={logout} icon={<LogOut size={17} />}>
          Çıkış yap
        </Button>
      </Card>
    </div>
  );
}
