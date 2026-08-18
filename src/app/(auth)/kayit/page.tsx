"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign, KeyRound, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { Button, Card, Field } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { AVATAR_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>(AVATAR_KEYS[0]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
          avatarKey,
          role: isTeacher ? "HOCAEFENDI" : "STUDENT",
          inviteCode: isTeacher ? inviteCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kayıt tamamlanamadı.");
        return;
      }
      router.replace(data.user.roleKey === "HOCAEFENDI" ? "/hocaefendi" : "/panel");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-black text-ink-900">Maceraya katıl</h1>
      <p className="mt-1 text-sm text-ink-400">Birkaç saniyede hesabını oluştur.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <span className="mb-2 block text-sm font-semibold text-ink-600">Avatarını seç</span>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_KEYS.slice(0, 6).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setAvatarKey(key)}
                className={cn(
                  "rounded-2xl p-1 transition",
                  avatarKey === key
                    ? "bg-brand-100 ring-2 ring-brand-400"
                    : "hover:bg-ink-50",
                )}
                aria-label={`Avatar ${key}`}
              >
                <Avatar avatarKey={key} size={44} />
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-400">
            Diğer avatarları mağazadan açabilirsin.
          </p>
        </div>

        <Field
          label="Kullanıcı adı"
          placeholder="MatematikAli"
          icon={<UserRound size={18} />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint="3-18 karakter. Harf, rakam ve alt çizgi kullanabilirsin."
          required
        />
        <Field
          label="E-posta"
          type="email"
          placeholder="ornek@mail.com"
          icon={<AtSign size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="E-posta adresin profilinde asla gösterilmez."
          required
        />
        <Field
          label="Şifre"
          type="password"
          placeholder="En az 6 karakter"
          icon={<KeyRound size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isTeacher}
              onChange={(e) => setIsTeacher(e.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
                <ShieldCheck size={16} /> Hocaefendi (yönetici) hesabı açıyorum
              </span>
              <span className="mt-0.5 block text-xs text-ink-400">
                Bu seçenek davet kodu gerektirir. Öğrenciler bu hesabı açamaz.
              </span>
            </span>
          </label>
          {isTeacher && (
            <div className="mt-3">
              <Field
                placeholder="Davet kodu"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={loading} icon={<Sparkles size={19} />}>
          Hesabımı Oluştur
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="font-bold text-brand-600 hover:underline">
          Giriş yap
        </Link>
      </p>
    </Card>
  );
}
