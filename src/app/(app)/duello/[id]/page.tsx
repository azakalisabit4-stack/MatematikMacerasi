"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Flag, Handshake, Swords, Trophy, XCircle } from "lucide-react";

import { Badge, Button, Card, Modal, PageLoader, ProgressBar } from "@/components/ui";
import { Avatar } from "@/components/visuals/Avatar";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { Confetti } from "@/components/visuals/Scenes";
import { useSession } from "@/components/app/SessionProvider";
import { cn, formatTime } from "@/lib/utils";
import { ROLE } from "@/lib/constants";

interface PlayerRow {
  userId: string;
  score: number;
  correct: number;
  wrong: number;
  currentIndex: number;
  finishedAt: number | null;
  leaguePointsDelta: number;
  username: string;
  avatarKey: string;
  frameKey: string;
  roleKey: string;
}

interface DuelState {
  duel: {
    id: string;
    mode: string;
    status: string;
    questionCount: number;
    durationSec: number;
    startedAt: number | null;
    endsAt: number | null;
    winnerId: string | null;
    isDraw: boolean;
    challenger: { id: string; username: string; avatarKey: string; frameKey: string; roleKey: string } | null;
    opponent: { id: string; username: string; avatarKey: string; frameKey: string; roleKey: string } | null;
  };
  me: PlayerRow | null;
  rival: PlayerRow | null;
  question: { index: number; prompt: string; options: string[]; total: number } | null;
  timeLeftSec: number;
  serverTime: number;
}

export default function DuelArenaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { summary, refresh } = useSession();
  const duelId = params.id;

  const [state, setState] = useState<DuelState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ chosen: number | null; correctIndex: number | null; correct: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const endsAtRef = useRef(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/duels/${duelId}`, { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Düello yüklenemedi.");
      return;
    }
    const data = (await res.json()) as DuelState;
    setState(data);
    endsAtRef.current = data.duel.endsAt ?? 0;
    setTimeLeft(data.timeLeftSec);
  }, [duelId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Gerçek zamanlı düello kanalı
  useEffect(() => {
    const es = new EventSource(`/api/events?duel=${encodeURIComponent(duelId)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type: string };
        if (data.type.startsWith("duel")) void load();
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [duelId, load]);

  // Yedek: yavaş yoklama (SSE kesilse bile skor güncel kalır)
  useEffect(() => {
    if (state?.duel.status !== "ACTIVE") return;
    const t = setInterval(() => void load(), 2500);
    return () => clearInterval(t);
  }, [state?.duel.status, load]);

  useEffect(() => {
    if (state?.duel.status !== "ACTIVE") return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) void load();
    }, 400);
    return () => clearInterval(t);
  }, [state?.duel.status, load]);

  const answer = async (index: number) => {
    if (!state?.question || busy || feedback) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/duels/${duelId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", questionIndex: state.question.index, answerIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Cevap gönderilemedi.");
        await load();
        return;
      }
      setFeedback({ chosen: index, correctIndex: data.correctIndex, correct: data.isCorrect });
      setTimeout(() => {
        setFeedback(null);
        setState(data.state);
      }, 520);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/duels/${duelId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) await load();
      else setError((await res.json()).error ?? "Kabul edilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const forfeit = async () => {
    setBusy(true);
    try {
      await fetch(`/api/duels/${duelId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forfeit" }),
      });
      await load();
      void refresh();
    } finally {
      setBusy(false);
      setConfirmExit(false);
    }
  };

  if (!state || !summary) return <PageLoader label="Düello yükleniyor..." />;

  const { duel, me, rival, question } = state;
  const isChallenger = duel.challenger?.id === summary.user.id;
  const meUser = isChallenger ? duel.challenger : duel.opponent;
  const rivalUser = isChallenger ? duel.opponent : duel.challenger;

  /* --------------------------------------------------------- BEKLEMEDE */
  if (duel.status === "PENDING") {
    const iAmInvited = duel.opponent?.id === summary.user.id;
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-coral-100 to-coral-400 text-white">
            <Swords size={30} />
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink-900">
            {iAmInvited ? "Sana düello teklifi geldi" : "Rakip bekleniyor"}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {duel.mode === "POINTS_SWAP" ? "Puan takaslı düello" : "Takassız düello"} ·{" "}
            {duel.questionCount} soru · {duel.durationSec} saniye
          </p>

          <div className="mt-6 flex items-center justify-center gap-6">
            <PlayerHead user={meUser} label="Sen" />
            <span className="text-2xl font-black text-ink-300">VS</span>
            <PlayerHead user={rivalUser} label="Rakip" />
          </div>

          <div className="mt-6 flex justify-center gap-3">
            {iAmInvited ? (
              <Button size="lg" loading={busy} onClick={accept}>
                Düelloyu kabul et
              </Button>
            ) : (
              <p className="text-sm font-semibold text-ink-500">
                Rakibin daveti kabul etmesini bekliyorsun...
              </p>
            )}
            <Link href="/duello">
              <Button size="lg" variant="secondary">
                Geri dön
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------- BİTTİ */
  if (duel.status !== "ACTIVE") {
    const won = duel.winnerId === summary.user.id;
    const finished = duel.status === "FINISHED";
    return (
      <div className="mx-auto max-w-xl">
        <Card className="relative overflow-hidden text-center">
          {finished && won && <Confetti />}
          <span
            className={cn(
              "mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white",
              duel.isDraw
                ? "bg-gradient-to-br from-ink-300 to-ink-500"
                : won
                  ? "bg-gradient-to-br from-sun-300 to-sun-500"
                  : "bg-gradient-to-br from-ink-200 to-ink-400",
            )}
          >
            {duel.isDraw ? <Handshake size={30} /> : won ? <Trophy size={30} /> : <Flag size={30} />}
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink-900">
            {!finished
              ? "Düello sonlandı"
              : duel.isDraw
                ? "Berabere!"
                : won
                  ? "Kazandın!"
                  : "Kaybettin"}
          </h1>

          <div className="mt-6 grid grid-cols-3 items-center gap-3">
            <ScoreSide player={me} user={meUser} highlight={won} />
            <div>
              <p className="text-3xl font-black text-ink-900">
                {me?.score ?? 0} - {rival?.score ?? 0}
              </p>
              <p className="mt-1 text-xs font-bold uppercase text-ink-400">Skor</p>
            </div>
            <ScoreSide player={rival} user={rivalUser} highlight={!won && !duel.isDraw} />
          </div>

          {duel.mode === "POINTS_SWAP" ? (
            <p className="mt-5 text-sm font-bold text-ink-600">
              Lig puanı değişimi:{" "}
              <span className={cn((me?.leaguePointsDelta ?? 0) >= 0 ? "text-mint-600" : "text-coral-600")}>
                {(me?.leaguePointsDelta ?? 0) > 0 ? "+" : ""}
                {me?.leaguePointsDelta ?? 0}
              </span>
            </p>
          ) : (
            <p className="mt-5 text-sm font-semibold text-ink-500">
              Takassız düello — lig puanların değişmedi.
            </p>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" onClick={() => router.push("/duello")}>
              Arenaya dön
            </Button>
            <Button size="lg" variant="secondary" onClick={() => router.push("/siralamalar")}>
              Sıralamalar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------- AKTİF */
  const myDone = !!me?.finishedAt;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-ink-100 bg-white p-4">
        <LivePlayer player={me} user={meUser} total={duel.questionCount} side="left" />
        <div className="text-center">
          <p className="text-xs font-bold uppercase text-ink-400">Süre</p>
          <p className={cn("text-2xl font-black", timeLeft < 15 ? "text-coral-600" : "text-ink-900")}>
            {formatTime(timeLeft)}
          </p>
          <Badge tone={duel.mode === "POINTS_SWAP" ? "brand" : "neutral"} className="mt-1">
            {duel.mode === "POINTS_SWAP" ? "Puan takaslı" : "Takassız"}
          </Badge>
        </div>
        <LivePlayer player={rival} user={rivalUser} total={duel.questionCount} side="right" />
      </div>

      {myDone ? (
        <Card className="text-center">
          <p className="text-lg font-extrabold text-ink-900">Sorularını tamamladın!</p>
          <p className="mt-1 text-sm text-ink-500">
            Rakibinin bitirmesi bekleniyor. Sonuç otomatik olarak açılacak.
          </p>
          <div className="mt-4 flex justify-center">
            <ProgressBar
              className="max-w-xs"
              value={rival?.currentIndex ?? 0}
              max={duel.questionCount}
              gradient="linear-gradient(90deg,#FCA5A5,#DC2626)"
            />
          </div>
        </Card>
      ) : question ? (
        <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
          <div
            className="px-5 py-10 text-center sm:py-14"
            style={{ background: "linear-gradient(160deg,#FFE4E6,#EEF4FF)" }}
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
              Soru {question.index + 1} / {question.total}
            </p>
            <p className="text-3xl font-black tracking-tight text-ink-900 sm:text-5xl">
              {question.prompt}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
            {question.options.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                disabled={busy || !!feedback}
                onClick={() => answer(i)}
                className={cn(
                  "rounded-2xl border-2 py-6 text-3xl font-black transition active:scale-[0.98] disabled:cursor-default sm:py-7 sm:text-4xl",
                  !feedback
                    ? "border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50"
                    : feedback.correctIndex === i
                      ? "border-mint-500 bg-mint-100 text-mint-600"
                      : feedback.chosen === i
                        ? "border-coral-500 bg-coral-100 text-coral-600"
                        : "border-ink-200 bg-white text-ink-400 opacity-60",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          {feedback && (
            <div className="pb-4 text-center">
              <span
                className={cn(
                  "anim-pop inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white",
                  feedback.correct ? "bg-mint-500" : "bg-coral-500",
                )}
              >
                {feedback.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                {feedback.correct ? "Doğru!" : "Yanlış"}
              </span>
            </div>
          )}
        </div>
      ) : (
        <Card className="text-center">
          <p className="font-bold text-ink-700">Sorular hazırlanıyor...</p>
        </Card>
      )}

      {error && (
        <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setConfirmExit(true)} icon={<Flag size={16} />}>
          Düellodan çekil
        </Button>
      </div>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Düellodan çekil?">
        <p className="text-sm text-ink-500">
          Kalan sorular boş sayılır ve düello o anki skorlarla sonuçlanır.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmExit(false)}>
            Devam et
          </Button>
          <Button variant="danger" block loading={busy} onClick={forfeit}>
            Çekil
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PlayerHead({
  user,
  label,
}: {
  user: { username: string; avatarKey: string; frameKey: string; roleKey: string } | null;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar avatarKey={user?.avatarKey} frameKey={user?.frameKey} size={64} />
      <p className="text-sm font-black text-ink-800">{user?.username ?? "—"}</p>
      <p className="text-xs text-ink-400">{label}</p>
      {user?.roleKey === ROLE.HOCAEFENDI && <Badge tone="sun">Hocaefendi</Badge>}
    </div>
  );
}

function LivePlayer({
  player,
  user,
  total,
  side,
}: {
  player: PlayerRow | null;
  user: { username: string; avatarKey: string; frameKey: string; roleKey: string } | null;
  total: number;
  side: "left" | "right";
}) {
  return (
    <div className={cn("flex items-center gap-3", side === "right" && "flex-row-reverse text-right")}>
      <Avatar avatarKey={user?.avatarKey} frameKey={user?.frameKey} size={46} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-800">{user?.username ?? "—"}</p>
        <p className="text-xl font-black text-ink-900">{player?.score ?? 0}</p>
        <ProgressBar
          className="mt-1"
          height={6}
          value={player?.currentIndex ?? 0}
          max={total}
          gradient={side === "left" ? "linear-gradient(90deg,#5B8FFB,#3568F0)" : "linear-gradient(90deg,#FCA5A5,#DC2626)"}
        />
      </div>
    </div>
  );
}

function ScoreSide({
  player,
  user,
  highlight,
}: {
  player: PlayerRow | null;
  user: { username: string; avatarKey: string; frameKey: string; roleKey: string } | null;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1", highlight && "scale-105")}>
      <Avatar avatarKey={user?.avatarKey} frameKey={user?.frameKey} size={56} />
      <p className="text-sm font-bold text-ink-800">{user?.username ?? "—"}</p>
      <p className="text-xs text-ink-400">
        {player?.correct ?? 0} doğru · {player?.wrong ?? 0} yanlış
      </p>
    </div>
  );
}
