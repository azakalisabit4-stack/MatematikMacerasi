"use client";

import { useEffect, useState } from "react";

import { Badge, Card, PageLoader, SectionTitle } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";

interface DuelRow {
  id: string;
  mode: string;
  status: string;
  createdAt: number;
  finishedAt: number | null;
  pointsDelta: number;
  isDraw: boolean;
  challenger: string;
  challengerRole: string;
  opponent: string;
  opponentRole: string;
  winner: string | null;
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-mint-100 text-mint-600",
  FINISHED: "bg-brand-50 text-brand-700",
  PENDING: "bg-sun-50 text-sun-600",
  DECLINED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-ink-100 text-ink-500",
  EXPIRED: "bg-ink-100 text-ink-500",
};

export default function AdminDuelsPage() {
  const [duels, setDuels] = useState<DuelRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      if (res.ok) setDuels((await res.json()).duels);
    })();
  }, []);

  if (!duels) return <PageLoader />;

  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <SectionTitle className="mb-0" title="Düellolar" subtitle="Son 60 düello kaydı" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-y border-ink-100 bg-ink-50/60 text-xs font-bold uppercase text-ink-400">
              <th className="py-3 pl-5 pr-2">Meydan okuyan</th>
              <th className="px-2">Rakip</th>
              <th className="px-2">Tür</th>
              <th className="px-2">Durum</th>
              <th className="px-2">Kazanan</th>
              <th className="px-2 text-right">Lig puanı</th>
              <th className="py-3 pl-2 pr-5">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {duels.map((d) => (
              <tr key={d.id} className="border-b border-ink-50">
                <td className="py-3 pl-5 pr-2 font-bold text-ink-800">
                  {d.challenger}
                  {d.challengerRole === ROLE.HOCAEFENDI && (
                    <Badge tone="sun" className="ml-1.5">
                      Hoca
                    </Badge>
                  )}
                </td>
                <td className="px-2 font-bold text-ink-800">
                  {d.opponent}
                  {d.opponentRole === ROLE.HOCAEFENDI && (
                    <Badge tone="sun" className="ml-1.5">
                      Hoca
                    </Badge>
                  )}
                </td>
                <td className="px-2 text-xs font-bold text-ink-500">
                  {d.mode === "POINTS_SWAP" ? "Puan takaslı" : "Takassız"}
                </td>
                <td className="px-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-black",
                      STATUS_TONE[d.status] ?? "bg-ink-100 text-ink-500",
                    )}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-2 font-bold text-ink-700">
                  {d.isDraw ? "Berabere" : (d.winner ?? "—")}
                </td>
                <td className="px-2 text-right font-black text-ink-900">
                  {d.mode === "POINTS_SWAP" && d.status === "FINISHED" && !d.isDraw
                    ? `±${d.pointsDelta}`
                    : "—"}
                </td>
                <td className="py-3 pl-2 pr-5 text-xs text-ink-400">
                  {relativeTime(d.finishedAt ?? d.createdAt)}
                </td>
              </tr>
            ))}
            {duels.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ink-400">
                  Henüz düello yapılmamış.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
