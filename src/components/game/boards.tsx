"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { BossMonster, Climber, CloudShape, MarketItem, SkyBackdrop, TrackScene } from "@/components/visuals/Scenes";

export interface BoardQuestion {
  index: number;
  prompt: string;
  options: string[];
  payload: Record<string, unknown>;
  total: number;
}

export interface BoardState {
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  climbStep: number;
  currentIndex: number;
  questionCount: number;
}

export interface Feedback {
  status: "idle" | "correct" | "wrong";
  chosen: number | null;
  correctIndex: number | null;
}

export interface BoardProps {
  question: BoardQuestion;
  state: BoardState;
  feedback: Feedback;
  busy: boolean;
  onAnswer: (index: number) => void;
  theme: { from: string; to: string; accent: string };
}

/* --------------------------------------------------------- ORTAK ŞIK BUTONU */

function optionClasses(idx: number, feedback: Feedback) {
  if (feedback.status === "idle") return "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50";
  if (feedback.correctIndex === idx) return "border-mint-500 bg-mint-100 text-mint-600";
  if (feedback.chosen === idx) return "border-coral-500 bg-coral-100 text-coral-600";
  return "border-ink-200 bg-white opacity-60";
}

export function OptionGrid({
  options,
  feedback,
  busy,
  onAnswer,
  columns = 2,
  big,
}: {
  options: string[];
  feedback: Feedback;
  busy: boolean;
  onAnswer: (i: number) => void;
  columns?: 2 | 3 | 4;
  big?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((opt, i) => (
        <button
          key={`${opt}-${i}`}
          disabled={busy || feedback.status !== "idle"}
          onClick={() => onAnswer(i)}
          className={cn(
            "rounded-2xl border-2 font-black text-ink-800 shadow-sm transition-all active:scale-[0.98] disabled:cursor-default",
            big ? "py-6 text-3xl sm:py-7 sm:text-4xl" : "py-4 text-xl sm:text-2xl",
            optionClasses(i, feedback),
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ================================================================ TIRMANIŞ */

export function ClimbBoard({ question, state, feedback, busy, onAnswer }: BoardProps) {
  const backwards = Boolean(question.payload.backwards);
  const current = Number(question.payload.current ?? 0);
  const step = Number(question.payload.step ?? 0);
  const maxSteps = state.questionCount;
  const heightPct = Math.min(88, (state.climbStep / Math.max(1, maxSteps)) * 88);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-100">
      <SkyBackdrop tone={backwards ? "mint" : "day"} />

      <div className="relative grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:p-6">
        {/* --- Seçenek bulutları --- */}
        <div className="order-2 sm:order-1">
          <div className="mb-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-center shadow-sm backdrop-blur">
            <p className="text-sm font-bold text-ink-500">
              {backwards ? `${step}'er geriye ritmik sayma` : `${step}'er ritmik sayma`}
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-ink-900 sm:text-lg">
              {question.prompt}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                disabled={busy || feedback.status !== "idle"}
                onClick={() => onAnswer(i)}
                className={cn(
                  "group relative flex h-24 items-center justify-center transition-transform active:scale-[0.97] disabled:cursor-default sm:h-28",
                  i % 2 === 1 && "translate-y-3",
                )}
              >
                <CloudShape
                  className="absolute inset-0 h-full w-full drop-shadow-[0_8px_16px_rgba(30,64,175,0.18)]"
                  color={
                    feedback.status === "idle"
                      ? "#FFFFFF"
                      : feedback.correctIndex === i
                        ? "#BBF7D0"
                        : feedback.chosen === i
                          ? "#FECACA"
                          : "#F1F5F9"
                  }
                />
                <span
                  className={cn(
                    "relative text-3xl font-black sm:text-4xl",
                    feedback.status === "idle"
                      ? "text-ink-800"
                      : feedback.correctIndex === i
                        ? "text-mint-600"
                        : feedback.chosen === i
                          ? "text-coral-600"
                          : "text-ink-400",
                  )}
                >
                  {opt}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* --- Tırmanış sahnesi --- */}
        <div className="order-1 sm:order-2">
          <div
            className="relative h-64 overflow-hidden rounded-2xl border border-white/80 shadow-inner sm:h-full sm:min-h-[340px]"
            style={{
              background: backwards
                ? "linear-gradient(180deg,#A9E8CE 0%,#DFF7EC 55%,#FFFFFF 100%)"
                : "linear-gradient(180deg,#A6DCFF 0%,#DDF0FF 55%,#FFFFFF 100%)",
            }}
          >
            {/* zirve bayrağı */}
            <div className="absolute left-1/2 top-2 -translate-x-1/2">
              <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
                <rect x="17" y="6" width="3" height="30" rx="1.5" fill="#64748B" />
                <path d="M20 7l14 6-14 6V7z" fill="#F43F5E" />
              </svg>
            </div>

            {/* basamak bulutları */}
            <div className="absolute inset-0">
              {Array.from({ length: 8 }).map((_, i) => {
                const reached = state.climbStep >= Math.round(((i + 1) / 8) * maxSteps);
                return (
                  <span
                    key={i}
                    className="absolute transition-opacity duration-500"
                    style={{
                      bottom: `${6 + i * 11}%`,
                      left: i % 2 === 0 ? "8%" : "48%",
                      opacity: reached ? 1 : 0.75,
                    }}
                  >
                    <CloudShape
                      className="w-20 drop-shadow-[0_4px_8px_rgba(30,64,175,0.14)] sm:w-24"
                      color={reached ? "#FFFFFF" : "#EFF6FF"}
                    />
                  </span>
                );
              })}
            </div>

            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 transition-all duration-500 ease-out",
                feedback.status === "wrong" && "anim-shake",
              )}
              style={{ bottom: `${10 + heightPct * 0.72}%` }}
            >
              <Climber
                size={72}
                mood={feedback.status === "wrong" ? "sad" : feedback.status === "correct" ? "cheer" : "happy"}
                className="anim-bob"
              />
              <span className="mt-1 block rounded-full bg-ink-800 px-3 py-1 text-center text-sm font-black text-white">
                {current}
              </span>
            </div>

            <div className="absolute right-2 top-2 rounded-xl bg-white/85 px-2 py-1 text-[11px] font-black text-ink-600 shadow-sm">
              {state.climbStep} / {maxSteps} basamak
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== QUIZ */

export function QuizBoard({ question, feedback, busy, onAnswer, theme }: BoardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <div
        className="px-5 py-10 text-center sm:py-14"
        style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
      >
        <p className="text-3xl font-black tracking-tight text-ink-900 sm:text-5xl">
          {question.prompt}
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <OptionGrid options={question.options} feedback={feedback} busy={busy} onAnswer={onAnswer} big />
      </div>
    </div>
  );
}

/* ================================================================ HEDEFİ VUR */

export function TargetBoard({ question, feedback, busy, onAnswer, theme }: BoardProps) {
  const target = String(question.payload.target ?? question.prompt.replace(/\D/g, ""));
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <div
        className="flex flex-col items-center gap-3 px-5 py-7"
        style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
      >
        <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-md" aria-hidden>
          <circle cx="60" cy="60" r="56" fill="#fff" />
          <circle cx="60" cy="60" r="46" fill="#EF4444" />
          <circle cx="60" cy="60" r="34" fill="#fff" />
          <circle cx="60" cy="60" r="23" fill="#EF4444" />
          <circle cx="60" cy="60" r="12" fill="#fff" />
          <circle cx="60" cy="60" r="5" fill="#111827" />
        </svg>
        <p className="rounded-full bg-white/90 px-5 py-2 text-2xl font-black text-ink-900 shadow-sm sm:text-3xl">
          Hedef: {target}
        </p>
        <p className="text-sm font-semibold text-ink-700/80">
          Bu sonucu veren işlemi seç
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <OptionGrid options={question.options} feedback={feedback} busy={busy} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

/* ============================================================== EŞLEŞTİRME */

export function MatchBoard({ question, feedback, busy, onAnswer, theme }: BoardProps) {
  const board = (question.payload.board as string[]) ?? [];
  const indexInGroup = Number(question.payload.indexInGroup ?? 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <div
        className="px-5 py-5"
        style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
      >
        <p className="text-center text-sm font-bold text-ink-700/80">
          İşlemi doğru sonucuyla eşleştir
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400">İşlemler</p>
          {board.map((expr, i) => (
            <div
              key={`${expr}-${i}`}
              className={cn(
                "rounded-2xl border-2 px-4 py-3 text-lg font-black transition",
                i < indexInGroup
                  ? "border-mint-200 bg-mint-100/60 text-mint-600 line-through"
                  : i === indexInGroup
                    ? "border-brand-400 bg-brand-50 text-ink-900 shadow-sm"
                    : "border-ink-100 bg-white text-ink-400",
              )}
            >
              {expr}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Sonuçlar</p>
          {question.options.map((opt, i) => (
            <button
              key={`${opt}-${i}`}
              disabled={busy || feedback.status !== "idle"}
              onClick={() => onAnswer(i)}
              className={cn(
                "w-full rounded-2xl border-2 px-4 py-3 text-lg font-black transition active:scale-[0.99] disabled:cursor-default",
                optionClasses(i, feedback),
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== PARKUR */

export function TrackBoard({ question, state, feedback, busy, onAnswer }: BoardProps) {
  return (
    <div className="space-y-4">
      <TrackScene
        progress={state.climbStep}
        total={state.questionCount}
        scene={String(question.payload.scene ?? "orman")}
      />
      <div className="rounded-3xl border border-ink-100 bg-white p-4 sm:p-5">
        <p className="mb-4 text-center text-3xl font-black text-ink-900 sm:text-4xl">
          {question.prompt}
        </p>
        <OptionGrid options={question.options} feedback={feedback} busy={busy} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

/* ================================================================== MARKET */

export function MarketBoard({ question, feedback, busy, onAnswer, theme }: BoardProps) {
  const items = (question.payload.items as Array<{ name: string; icon: string; price: number }>) ?? [];
  const paid = question.payload.paid as number | undefined;

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <div
        className="p-5"
        style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
      >
        {items.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3">
            {items.map((it, i) => (
              <MarketItem key={`${it.name}-${i}`} icon={it.icon} name={it.name} price={it.price} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <svg viewBox="0 0 96 72" className="h-20" aria-hidden>
              <rect x="8" y="20" width="80" height="46" rx="8" fill="#fff" />
              <rect x="8" y="20" width="80" height="12" rx="6" fill="#0EA5E9" />
              <circle cx="48" cy="48" r="12" fill="#FDE68A" stroke="#F59E0B" strokeWidth="3" />
              <path d="M44 48h8M48 44v8" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {paid !== undefined && (
          <p className="mt-3 text-center text-sm font-black text-ink-800">
            Kasaya verilen: {paid} TL
          </p>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <p className="mb-4 text-center text-lg font-extrabold leading-snug text-ink-900 sm:text-xl">
          {question.prompt}
        </p>
        <OptionGrid options={question.options} feedback={feedback} busy={busy} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

/* ==================================================================== BOSS */

export function BossBoard({ question, state, feedback, busy, onAnswer }: BoardProps) {
  const maxHp = Number(question.payload.maxHp ?? state.questionCount);
  const hp = Math.max(0, maxHp - state.correct);
  const ratio = maxHp === 0 ? 0 : hp / maxHp;
  const variant = String(question.payload.boss ?? "golem");

  const playerHp = useMemo(() => Math.max(0, 100 - state.wrong * 10), [state.wrong]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-b from-grape-100 to-white p-5">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs font-black text-ink-600">
            <span>{variant === "ejderha" ? "Çarpım Ejderhası" : "Sayı Golemi"}</span>
            <span>
              {hp} / {maxHp}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-coral-400 to-coral-600 transition-all duration-500"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-center gap-6">
          <div className="flex flex-col items-center">
            <Climber size={64} mood={feedback.status === "wrong" ? "sad" : "happy"} className="anim-bob" />
            <div className="mt-1 h-2 w-16 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full bg-gradient-to-r from-mint-400 to-mint-600 transition-all"
                style={{ width: `${playerHp}%` }}
              />
            </div>
          </div>
          <BossMonster hpRatio={ratio} variant={variant} size={160} hurt={feedback.status === "correct"} />
        </div>
      </div>

      <div className="rounded-3xl border border-ink-100 bg-white p-4 sm:p-5">
        <p className="mb-4 text-center text-3xl font-black text-ink-900 sm:text-4xl">
          {question.prompt}
        </p>
        <OptionGrid options={question.options} feedback={feedback} busy={busy} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- SEÇİCİ */

export function GameBoard(props: BoardProps & { renderer: string }) {
  switch (props.renderer) {
    case "climb":
      return <ClimbBoard {...props} />;
    case "target":
      return <TargetBoard {...props} />;
    case "match":
      return <MatchBoard {...props} />;
    case "track":
      return <TrackBoard {...props} />;
    case "market":
      return <MarketBoard {...props} />;
    case "boss":
      return <BossBoard {...props} />;
    default:
      return <QuizBoard {...props} />;
  }
}
