"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Flag, RotateCcw, Timer, Trophy, X, XCircle } from "lucide-react";

import { Badge, Button, Card, Modal, ProgressBar, Spinner } from "@/components/ui";
import { IconTile, MMIcon } from "@/components/visuals/Icon";
import { Confetti } from "@/components/visuals/Scenes";
import { GameBoard, type BoardQuestion, type Feedback } from "./boards";
import { useSession } from "@/components/app/SessionProvider";
import { cn, formatNumber, formatTime } from "@/lib/utils";

interface GameDefLite {
  key: string;
  name: string;
  shortName: string;
  description: string;
  renderer: string;
  iconKey: string;
  durationSec: number;
  questionCount: number;
  theme: { from: string; to: string; accent: string };
  variants: Array<{ key: string; label: string; description?: string; step?: number }>;
}

interface SessionState {
  sessionId: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  climbStep: number;
  currentIndex: number;
  questionCount: number;
  durationSec: number;
  timeLeftSec: number;
  endsAt: number;
  serverTime: number;
}

interface Summary {
  gameName: string;
  baseScore: number;
  timeBonus: number;
  score: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  xpEarned: number;
  pointsEarned: number;
  isPerfect: boolean;
  isNewRecord: boolean;
  previousRecord: number;
  completedAll: boolean;
  level: number;
  leveledUp: boolean;
  totalPoints: number;
  unlockedAchievements: Array<{ key: string; name: string; iconKey: string; tier: string }>;
  completedTasks: Array<{ key: string; title: string }>;
}

type Phase = "setup" | "playing" | "result";

export function GamePlayer({ game }: { game: GameDefLite }) {
  const router = useRouter();
  const { refresh } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [variant, setVariant] = useState(game.variants[0]?.key ?? "default");
  const [startOptions, setStartOptions] = useState<number[] | null>(null);
  const [needsStart, setNeedsStart] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const [state, setState] = useState<SessionState | null>(null);
  const [question, setQuestion] = useState<BoardQuestion | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ status: "idle", chosen: null, correctIndex: null });
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(game.durationSec);
  const [floating, setFloating] = useState<{ id: number; text: string; good: boolean } | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const endsAtRef = useRef<number>(0);
  const finishingRef = useRef(false);

  /* ------------------------------------------------------------ HAZIRLIK */

  const prepare = useCallback(
    async (variantKey: string) => {
      setPreparing(true);
      setError(null);
      try {
        const res = await fetch("/api/games/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameKey: game.key, variant: variantKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Oyun hazırlanamadı.");
          return;
        }
        setNeedsStart(data.needsStart);
        setStartOptions(data.needsStart ? data.startOptions : null);
        if (!data.needsStart) await beginGame(variantKey, undefined);
      } finally {
        setPreparing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.key],
  );

  const beginGame = useCallback(
    async (variantKey: string, startValue?: number) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/games/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameKey: game.key, variant: variantKey, startValue }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Oyun başlatılamadı.");
          return;
        }
        finishingRef.current = false;
        setState(data.state);
        setQuestion(data.question);
        endsAtRef.current = data.state.endsAt;
        setTimeLeft(Math.max(0, Math.ceil((data.state.endsAt - Date.now()) / 1000)));
        setFeedback({ status: "idle", chosen: null, correctIndex: null });
        setPhase("playing");
      } finally {
        setBusy(false);
      }
    },
    [game.key],
  );

  /* --------------------------------------------------------------- SÜRE */

  const finish = useCallback(async () => {
    if (!state || finishingRef.current) return;
    finishingRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${state.sessionId}/finish`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setPhase("result");
        void refresh();
      } else {
        setError(data.error ?? "Oyun kapatılamadı.");
        finishingRef.current = false;
      }
    } finally {
      setBusy(false);
    }
  }, [state, refresh]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        void finish();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [phase, finish]);

  /* -------------------------------------------------------------- CEVAP */

  const answer = async (optionIndex: number) => {
    if (!state || !question || busy || feedback.status !== "idle") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${state.sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: question.index, answerIndex: optionIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Cevap gönderilemedi.");
        return;
      }

      setFeedback({
        status: data.isCorrect ? "correct" : "wrong",
        chosen: optionIndex,
        correctIndex: data.correctIndex,
      });
      setFloating({
        id: Date.now(),
        text: `${data.pointsDelta >= 0 ? "+" : ""}${data.pointsDelta}`,
        good: data.isCorrect,
      });
      setState(data.state);

      const delay = data.isCorrect ? 480 : 780;
      setTimeout(() => {
        setFloating(null);
        if (data.finished) {
          finishingRef.current = true;
          setSummary(data.summary);
          setPhase("result");
          void refresh();
        } else {
          setQuestion(data.nextQuestion);
          setFeedback({ status: "idle", chosen: null, correctIndex: null });
        }
      }, delay);
    } finally {
      setBusy(false);
    }
  };

  /* ================================================================ KURULUM */

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="relative overflow-hidden" padded={false}>
          <div
            className="p-6 sm:p-8"
            style={{ background: `linear-gradient(150deg, ${game.theme.from}, ${game.theme.to})` }}
          >
            <div className="flex items-start gap-4">
              <IconTile
                name={game.iconKey}
                size={56}
                colors={{ from: "#ffffff", to: "#ffffff", accent: game.theme.accent }}
              />
              <div>
                <h1 className="text-2xl font-black leading-tight text-ink-900 sm:text-3xl">
                  {game.name}
                </h1>
                <p className="mt-1 max-w-xl text-sm text-ink-700/80">{game.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-700">
                  <span className="rounded-full bg-white/80 px-3 py-1">{game.durationSec} saniye</span>
                  <span className="rounded-full bg-white/80 px-3 py-1">
                    {game.questionCount} soru
                  </span>
                  <span className="rounded-full bg-white/80 px-3 py-1">Süre bonusu var</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {game.variants.length > 1 && (
          <Card>
            <h2 className="mb-3 text-lg font-extrabold text-ink-900">
              {game.renderer === "climb" ? "Ritmik sayacağın sayıyı seç" : "Zorluk / mod seç"}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {game.variants.map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    setVariant(v.key);
                    setStartOptions(null);
                    setNeedsStart(false);
                  }}
                  className={cn(
                    "rounded-2xl border-2 px-3 py-4 text-center transition",
                    variant === v.key
                      ? "border-brand-400 bg-brand-50 shadow-sm"
                      : "border-ink-100 bg-white hover:border-brand-200",
                  )}
                >
                  <span className="block text-2xl font-black text-ink-900">
                    {v.step ?? v.label.slice(0, 6)}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-ink-500">
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {needsStart && startOptions && (
          <Card>
            <h2 className="mb-1 text-lg font-extrabold text-ink-900">Başlangıç sayısını seç</h2>
            <p className="mb-4 text-sm text-ink-400">
              Bu sayıdan başlayarak {variant}&apos;er ritmik sayacaksın.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {startOptions.map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => beginGame(variant, s)}
                  className="relative flex h-24 items-center justify-center transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  <svg viewBox="0 0 200 96" className="absolute inset-0 h-full w-full drop-shadow-md" aria-hidden>
                    <g fill="#fff">
                      <ellipse cx="60" cy="60" rx="46" ry="30" />
                      <ellipse cx="105" cy="44" rx="40" ry="34" />
                      <ellipse cx="148" cy="62" rx="38" ry="26" />
                      <rect x="40" y="58" width="120" height="30" rx="15" />
                    </g>
                  </svg>
                  <span className="relative text-3xl font-black text-ink-800">{s}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {error && (
          <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            loading={preparing || busy}
            onClick={() => prepare(variant)}
            icon={<MMIcon name="game" size={19} />}
          >
            {game.renderer === "climb" && !needsStart ? "Başlangıç sayılarını göster" : "Oyuna Başla"}
          </Button>
          <Link href="/oyunlar">
            <Button size="lg" variant="secondary">
              Haritaya dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ================================================================ SONUÇ */

  if (phase === "result" && summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="relative overflow-hidden">
          {(summary.isPerfect || summary.isNewRecord) && <Confetti />}
          <div className="relative text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sun-200 to-sun-400 text-ink-900">
              <Trophy size={30} />
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900">
              {summary.completedAll ? "Oyun tamamlandı!" : "Oyun bitti"}
            </h1>
            <p className="mt-1 text-sm text-ink-400">{summary.gameName}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ResultTile label="Puan" value={formatNumber(summary.score)} tone="brand" />
              <ResultTile label="Doğru" value={String(summary.correct)} tone="mint" />
              <ResultTile label="Yanlış" value={String(summary.wrong)} tone="coral" />
              <ResultTile label="Süre bonusu" value={`+${summary.timeBonus}`} tone="sun" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-ink-100 bg-white p-4 text-left">
                <p className="text-xs font-bold uppercase text-ink-400">Kazanılan XP</p>
                <p className="mt-1 text-2xl font-black text-ink-900">+{summary.xpEarned}</p>
                {summary.leveledUp && (
                  <Badge tone="sun" className="mt-2">
                    Level {summary.level} oldun!
                  </Badge>
                )}
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4 text-left">
                <p className="text-xs font-bold uppercase text-ink-400">En uzun seri</p>
                <p className="mt-1 text-2xl font-black text-ink-900">{summary.bestStreak}</p>
                {summary.isNewRecord && (
                  <Badge tone="mint" className="mt-2">
                    Yeni rekor! (önceki {summary.previousRecord})
                  </Badge>
                )}
              </div>
            </div>

            {summary.unlockedAchievements.length > 0 && (
              <div className="mt-4 rounded-2xl border border-sun-200 bg-sun-50 p-4 text-left">
                <p className="mb-2 text-sm font-extrabold text-sun-600">Yeni başarımlar</p>
                <div className="flex flex-wrap gap-2">
                  {summary.unlockedAchievements.map((a) => (
                    <span
                      key={a.key}
                      className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-white px-3 py-1.5 text-sm font-bold text-ink-700"
                    >
                      <IconTile name={a.iconKey} tier={a.tier} size={24} />
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.completedTasks.length > 0 && (
              <div className="mt-3 rounded-2xl border border-mint-200 bg-mint-100/60 p-4 text-left">
                <p className="mb-1 text-sm font-extrabold text-mint-600">Günlük görev tamamlandı</p>
                <ul className="text-sm font-semibold text-ink-600">
                  {summary.completedTasks.map((t) => (
                    <li key={t.key}>· {t.title}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                icon={<RotateCcw size={18} />}
                onClick={() => {
                  setSummary(null);
                  setState(null);
                  setQuestion(null);
                  setStartOptions(null);
                  setNeedsStart(false);
                  setPhase("setup");
                }}
              >
                Tekrar oyna
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push("/oyunlar")}>
                Haritaya dön
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ================================================================ OYUN */

  if (!state || !question) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const timePct = state.durationSec ? timeLeft / state.durationSec : 0;

  return (
    <div className={cn("mx-auto max-w-3xl space-y-4", feedback.status === "wrong" && "anim-shake")}>
      {/* --------------------------------------------------------- ÜST HUD */}
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl bg-ink-800 px-4 py-2.5 text-center text-sm font-black uppercase tracking-wide text-white">
          {game.shortName}
          {game.variants.length > 1 && <span className="text-sun-300"> · {variant}</span>}
        </div>
        <button
          onClick={() => setConfirmExit(true)}
          className="rounded-2xl border border-coral-200 bg-white p-2.5 text-coral-500 transition hover:bg-coral-100"
          aria-label="Oyundan çık"
        >
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <div className="rounded-2xl border border-ink-100 bg-white px-1.5 py-2 text-center sm:px-3">
          <p className="text-[10px] font-bold uppercase text-ink-400 sm:text-[11px]">Süre</p>
          <p className={cn("text-base font-black sm:text-lg", timePct < 0.25 ? "text-coral-600" : "text-ink-900")}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white px-1.5 py-2 text-center sm:px-3">
          <p className="text-[10px] font-bold uppercase text-ink-400 sm:text-[11px]">Soru</p>
          <p className="text-base font-black text-ink-900 sm:text-lg">
            {Math.min(state.currentIndex + 1, state.questionCount)}/{state.questionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50 px-1.5 py-2 text-center sm:px-3">
          <p className="text-[10px] font-bold uppercase text-brand-500 sm:text-[11px]">Puan</p>
          <p className="text-base font-black text-brand-700 sm:text-lg">{state.score}</p>
        </div>
        <div className="rounded-2xl border border-mint-200 bg-mint-100/60 px-1.5 py-2 text-center sm:px-3">
          <p className="text-[10px] font-bold uppercase text-mint-600 sm:text-[11px]">Doğru</p>
          <p className="text-base font-black text-mint-600 sm:text-lg">{state.correct}</p>
        </div>
        <div className="rounded-2xl border border-coral-100 bg-coral-100/50 px-1.5 py-2 text-center sm:px-3">
          <p className="text-[10px] font-bold uppercase text-coral-600 sm:text-[11px]">Yanlış</p>
          <p className="text-base font-black text-coral-600 sm:text-lg">{state.wrong}</p>
        </div>
      </div>

      <ProgressBar
        value={timeLeft}
        max={state.durationSec}
        height={8}
        gradient={
          timePct < 0.25
            ? "linear-gradient(90deg,#FCA5A5,#DC2626)"
            : "linear-gradient(90deg,#5B8FFB,#3568F0)"
        }
      />

      {/* --------------------------------------------------------- TAHTA */}
      <div className="relative">
        {floating && (
          <span
            key={floating.id}
            className={cn(
              "anim-float pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 text-4xl font-black drop-shadow",
              floating.good ? "text-mint-600" : "text-coral-600",
            )}
          >
            {floating.text}
          </span>
        )}

        <div className={cn("relative rounded-3xl", feedback.status === "wrong" && "flash-wrong")}>
          <GameBoard
            renderer={game.renderer}
            question={question}
            state={state}
            feedback={feedback}
            busy={busy}
            onAnswer={answer}
            theme={game.theme}
          />
        </div>

        {feedback.status !== "idle" && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
            <span
              className={cn(
                "anim-pop inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white shadow-lg",
                feedback.status === "correct" ? "bg-mint-500" : "bg-coral-500",
              )}
            >
              {feedback.status === "correct" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {feedback.status === "correct" ? "Doğru!" : "Yanlış"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-white px-3 py-2 text-xs font-bold text-ink-600 sm:text-sm">
          <Timer size={16} className="shrink-0" /> Kalan süre puana eklenir
        </span>
        <Button
          variant="danger"
          className="shrink-0 whitespace-nowrap"
          onClick={() => setConfirmExit(true)}
          icon={<Flag size={17} />}
        >
          Oyunu Bitir
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-coral-100 bg-coral-100/60 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </div>
      )}

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Oyunu bitirmek istiyor musun?">
        <p className="text-sm text-ink-500">
          Şu ana kadar kazandığın <strong className="text-ink-800">{state.score} puan</strong> kaybolmaz,
          hesabına eklenir. Ancak süre bonusu yalnızca tüm soruları bitirenlere verilir.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmExit(false)}>
            Devam et
          </Button>
          <Button
            variant="danger"
            block
            loading={busy}
            onClick={() => {
              setConfirmExit(false);
              void finish();
            }}
          >
            Bitir
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ResultTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "mint" | "coral" | "sun";
}) {
  const tones: Record<string, string> = {
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    mint: "border-mint-200 bg-mint-100/60 text-mint-600",
    coral: "border-coral-100 bg-coral-100/60 text-coral-600",
    sun: "border-sun-200 bg-sun-50 text-sun-600",
  };
  return (
    <div className={cn("rounded-2xl border px-3 py-3", tones[tone])}>
      <p className="text-[11px] font-bold uppercase opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-black">{value}</p>
    </div>
  );
}
