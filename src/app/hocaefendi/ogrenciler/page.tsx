"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Pencil, Search } from "lucide-react";

import { Badge, Button, Card, Field, Modal, PageLoader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

interface Student {
  id: string;
  username: string;
  email: string;
  avatarKey: string;
  frameKey: string;
  isActive: boolean;
  createdAt: number;
  lastSeenAt: number;
  online: boolean;
  level: number;
  totalPoints: number;
  leagueKey: string;
  leagueName: string;
  leaguePoints: number;
  duelWins: number;
  duelLosses: number;
  gamesPlayed: number;
  accuracy: number;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [query, setQuery] = useState("");
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [renaming, setRenaming] = useState<Student | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/students?q=${encodeURIComponent(query)}&online=${onlyOnline ? "1" : "0"}`,
      { cache: "no-store" },
    );
    if (res.ok) setStudents((await res.json()).students);
  }, [query, onlyOnline]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) setMsg({ tone: "err", text: json.error ?? "İşlem başarısız." });
      else {
        setMsg({ tone: "ok", text: "İşlem tamamlandı." });
        setRenaming(null);
        setNewName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Öğrenciler" subtitle="Ara, incele, kullanıcı adını düzenle" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Field
              placeholder="Kullanıcı adına göre ara..."
              icon={<Search size={18} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={onlyOnline}
              onChange={(e) => setOnlyOnline(e.target.checked)}
            />
            Sadece çevrimiçi
          </label>
        </div>
        {msg && (
          <p
            className={cn(
              "mt-3 rounded-2xl px-4 py-2.5 text-sm font-semibold",
              msg.tone === "ok"
                ? "border border-mint-200 bg-mint-100/60 text-mint-600"
                : "border border-coral-100 bg-coral-100/60 text-coral-600",
            )}
          >
            {msg.text}
          </p>
        )}
      </Card>

      {!students ? (
        <PageLoader />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-xs font-bold uppercase text-ink-400">
                  <th className="py-3 pl-5 pr-2">Öğrenci</th>
                  <th className="px-2">Level</th>
                  <th className="px-2">Lig</th>
                  <th className="px-2 text-right">Puan</th>
                  <th className="px-2 text-right">Oyun</th>
                  <th className="px-2 text-right">Doğruluk</th>
                  <th className="px-2 text-right">Düello</th>
                  <th className="px-2">Son görülme</th>
                  <th className="py-3 pl-2 pr-5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className={cn("border-b border-ink-50", !s.isActive && "opacity-55")}>
                    <td className="py-3 pl-5 pr-2">
                      <Link href={`/hocaefendi/ogrenciler/${s.id}`} className="inline-flex items-center gap-2.5">
                        <Avatar avatarKey={s.avatarKey} frameKey={s.frameKey} size={34} online={s.online} />
                        <span>
                          <span className="block font-bold text-ink-800 hover:underline">{s.username}</span>
                          {!s.isActive && <Badge tone="coral">Devre dışı</Badge>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 font-bold text-ink-600">{s.level}</td>
                    <td className="px-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500">
                        <LeagueBadge leagueKey={s.leagueKey} size={18} /> {s.leagueName}
                      </span>
                    </td>
                    <td className="px-2 text-right font-black text-ink-900">{formatNumber(s.totalPoints)}</td>
                    <td className="px-2 text-right font-bold text-ink-600">{s.gamesPlayed}</td>
                    <td className="px-2 text-right font-bold text-ink-600">%{s.accuracy}</td>
                    <td className="px-2 text-right font-bold text-ink-600">
                      {s.duelWins}/{s.duelLosses}
                    </td>
                    <td className="px-2 text-xs text-ink-400">{relativeTime(s.lastSeenAt)}</td>
                    <td className="py-3 pl-2 pr-5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setRenaming(s);
                            setNewName(s.username);
                          }}
                          className="rounded-xl border border-ink-200 p-2 text-ink-500 transition hover:bg-ink-50"
                          aria-label="Kullanıcı adını düzenle"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => post({ action: "setActive", userId: s.id, isActive: !s.isActive })}
                          className={cn(
                            "rounded-xl border p-2 transition",
                            s.isActive
                              ? "border-coral-200 text-coral-500 hover:bg-coral-100"
                              : "border-mint-200 text-mint-600 hover:bg-mint-100",
                          )}
                          aria-label={s.isActive ? "Devre dışı bırak" : "Etkinleştir"}
                        >
                          {s.isActive ? <Ban size={15} /> : <Check size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-ink-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Kullanıcı adını değiştir">
        <p className="text-sm text-ink-500">
          Eski kullanıcı adı sistem tarafından rezerve edilir ve tekrar kullanılamaz.
        </p>
        <div className="mt-4">
          <Field
            label="Yeni kullanıcı adı"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="MatematikAli"
          />
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" block onClick={() => setRenaming(null)}>
            Vazgeç
          </Button>
          <Button
            block
            loading={busy}
            onClick={() => post({ action: "rename", userId: renaming?.id, username: newName })}
          >
            Kaydet
          </Button>
        </div>
      </Modal>
    </div>
  );
}
