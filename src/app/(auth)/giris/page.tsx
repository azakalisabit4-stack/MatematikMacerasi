"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, LogIn, UserRound } from "lucide-react";

import { Button, Card, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Giriş yapılamadı.");
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
      <h1 className="text-2xl font-black text-ink-900">Tekrar hoş geldin</h1>
      <p className="mt-1 text-sm text-ink-400">
        Maceraya kaldığın yerden devam et.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field
          label="E-posta veya kullanıcı adı"
          placeholder="ornek@mail.com"
          icon={<UserRound size={18} />}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          required
        />
        <Field
          label="Şifre"
          type="password"
          placeholder="••••••••"
          icon={<KeyRound size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={loading} icon={<LogIn size={19} />}>
          Giriş Yap
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-bold text-brand-600 hover:underline">
          Hemen kayıt ol
        </Link>
      </p>
    </Card>
  );
}
