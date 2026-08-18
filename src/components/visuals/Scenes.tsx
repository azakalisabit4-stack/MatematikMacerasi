"use client";

import { cn } from "@/lib/utils";

/* ============================================================== BULUTLAR */

export function CloudShape({
  className,
  color = "#FFFFFF",
  opacity = 1,
}: {
  className?: string;
  color?: string;
  opacity?: number;
}) {
  return (
    <svg viewBox="0 0 200 96" className={className} aria-hidden>
      <g fill={color} opacity={opacity}>
        <ellipse cx="60" cy="60" rx="46" ry="30" />
        <ellipse cx="105" cy="44" rx="40" ry="34" />
        <ellipse cx="148" cy="62" rx="38" ry="26" />
        <rect x="40" y="58" width="120" height="30" rx="15" />
      </g>
    </svg>
  );
}

/* ================================================================ GÖKYÜZÜ */

export function SkyBackdrop({ className, tone = "day" }: { className?: string; tone?: "day" | "mint" | "violet" | "sunset" }) {
  const palettes: Record<string, [string, string, string]> = {
    day: ["#BFE6FF", "#E4F4FF", "#FFFFFF"],
    mint: ["#BDF0DA", "#E6FBF2", "#FFFFFF"],
    violet: ["#D6D8FF", "#EEF0FF", "#FFFFFF"],
    sunset: ["#FFD9BE", "#FFF0E2", "#FFFFFF"],
  };
  const [a, b, c] = palettes[tone] ?? palettes.day;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${a} 0%, ${b} 55%, ${c} 100%)` }}
      />
      <svg viewBox="0 0 400 60" className="absolute bottom-0 w-full" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40c40-14 70 8 110 4s60-20 96-16 58 22 96 16 58-16 98-22v38H0V40z" fill="#fff" opacity="0.85" />
      </svg>
      <CloudShape className="anim-drift absolute left-[6%] top-[12%] w-28 opacity-80" />
      <CloudShape className="anim-drift absolute right-[10%] top-[24%] w-20 opacity-70" />
      <CloudShape className="anim-drift absolute left-[42%] top-[6%] w-16 opacity-60" />
      <svg viewBox="0 0 100 100" className="anim-spin-slow absolute right-[6%] top-[6%] h-16 w-16" aria-hidden>
        <circle cx="50" cy="50" r="22" fill="#FFD75E" />
        <g stroke="#FFD75E" strokeWidth="5" strokeLinecap="round">
          <path d="M50 6v12M50 82v12M6 50h12M82 50h12M18 18l9 9M73 73l9 9M82 18l-9 9M27 73l-9 9" />
        </g>
      </svg>
    </div>
  );
}

/* ============================================================== KARAKTER */

export function Climber({
  size = 72,
  className,
  mood = "happy",
}: {
  size?: number;
  className?: string;
  mood?: "happy" | "sad" | "cheer";
}) {
  return (
    <svg
      viewBox="0 0 80 100"
      width={size}
      height={(size * 100) / 80}
      className={cn("drop-shadow-[0_6px_10px_rgba(30,58,138,0.25)]", className)}
      aria-hidden
    >
      {/* sırt çantası */}
      <rect x="14" y="42" width="20" height="26" rx="7" fill="#F97316" />
      {/* bacaklar */}
      <path d="M32 66l-6 24" stroke="#1E3A8A" strokeWidth="9" strokeLinecap="round" />
      <path d="M46 66l8 22" stroke="#1E3A8A" strokeWidth="9" strokeLinecap="round" />
      <path d="M22 90h12M50 88h12" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
      {/* gövde */}
      <rect x="26" y="40" width="28" height="30" rx="12" fill="#F59E0B" />
      {/* kollar */}
      {mood === "cheer" ? (
        <>
          <path d="M28 46L14 30" stroke="#F7D3B4" strokeWidth="8" strokeLinecap="round" />
          <path d="M52 46L66 30" stroke="#F7D3B4" strokeWidth="8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M28 48L14 58" stroke="#F7D3B4" strokeWidth="8" strokeLinecap="round" />
          <path d="M52 46L68 34" stroke="#F7D3B4" strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {/* kafa */}
      <circle cx="40" cy="26" r="16" fill="#F7D3B4" />
      <path d="M24 24c0-10 7-16 16-16s16 6 16 16c0 2-1 3-2 3-2-6-6-8-14-8s-12 2-14 8c-1 0-2-1-2-3z" fill="#6B4226" />
      <circle cx="34" cy="26" r="2.4" fill="#1F2937" />
      <circle cx="46" cy="26" r="2.4" fill="#1F2937" />
      {mood === "sad" ? (
        <path d="M34 35c2-2.4 4-3.2 6-3.2s4 .8 6 3.2" stroke="#9A3412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M34 32c2 2.6 4 3.6 6 3.6s4-1 6-3.6" stroke="#9A3412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      <ellipse cx="29" cy="31" rx="3" ry="2" fill="#F87171" opacity="0.4" />
      <ellipse cx="51" cy="31" rx="3" ry="2" fill="#F87171" opacity="0.4" />
    </svg>
  );
}

/* =============================================================== BOSS */

export function BossMonster({
  hpRatio,
  variant = "golem",
  size = 180,
  hurt,
}: {
  hpRatio: number;
  variant?: string;
  size?: number;
  hurt?: boolean;
}) {
  const dragon = variant === "ejderha";
  const body = dragon ? "#DC2626" : "#7C3AED";
  const body2 = dragon ? "#F87171" : "#A78BFA";
  return (
    <svg
      viewBox="0 0 200 180"
      width={size}
      height={(size * 180) / 200}
      className={cn("transition", hurt && "anim-shake")}
      aria-hidden
      style={{ filter: hpRatio < 0.34 ? "saturate(0.7) brightness(0.95)" : undefined }}
    >
      {dragon ? (
        <>
          <path d="M40 120c0-40 26-66 60-66s60 26 60 66c0 22-27 38-60 38s-60-16-60-38z" fill={body} />
          <path d="M62 60L44 26l34 14zM138 60l18-34-34 14z" fill={body2} />
          <path d="M30 116c-16-6-24-22-18-34 10 4 18 12 22 22M170 116c16-6 24-22 18-34-10 4-18 12-22 22" fill={body2} />
        </>
      ) : (
        <>
          <rect x="44" y="52" width="112" height="100" rx="26" fill={body} />
          <rect x="30" y="76" width="20" height="52" rx="10" fill={body2} />
          <rect x="150" y="76" width="20" height="52" rx="10" fill={body2} />
          <rect x="70" y="24" width="60" height="30" rx="12" fill={body2} />
        </>
      )}
      <ellipse cx="100" cy="98" rx="44" ry="34" fill="#fff" fillOpacity="0.18" />
      <circle cx="80" cy="92" r="11" fill="#fff" />
      <circle cx="120" cy="92" r="11" fill="#fff" />
      <circle cx="82" cy="94" r="5" fill="#111827" />
      <circle cx="122" cy="94" r="5" fill="#111827" />
      {hpRatio > 0.5 ? (
        <path d="M78 124c8 7 36 7 44 0" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M78 128c8-8 36-8 44 0" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      <path d="M84 112l8 6-8 6M116 112l-8 6 8 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================== KONFETİ */

export function Confetti({ count = 26 }: { count?: number }) {
  const colors = ["#3568F0", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="anim-confetti absolute block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 97) % 100}%`,
            top: "-8px",
            background: colors[i % colors.length],
            animationDelay: `${(i % 8) * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================== PARKUR */

export function TrackScene({ progress, total, scene = "orman" }: { progress: number; total: number; scene?: string }) {
  const pct = total ? Math.min(1, progress / total) : 0;
  const forest = scene !== "sahil";
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-3xl border border-ink-100">
      <div
        className="absolute inset-0"
        style={{
          background: forest
            ? "linear-gradient(180deg,#DBF6E4 0%,#F1FDF5 70%,#FFFFFF 100%)"
            : "linear-gradient(180deg,#CFEFFF 0%,#EAF8FF 70%,#FFF7E4 100%)",
        }}
      />
      {/* zemin */}
      <div
        className="absolute bottom-0 h-12 w-full"
        style={{ background: forest ? "#86D9A6" : "#FDE7B0" }}
      />
      {/* dekor */}
      {Array.from({ length: 7 }).map((_, i) => (
        <svg key={i} viewBox="0 0 40 60" className="absolute bottom-10 h-16" style={{ left: `${6 + i * 13}%` }} aria-hidden>
          {forest ? (
            <>
              <rect x="17" y="34" width="6" height="24" rx="3" fill="#8B5A2B" />
              <circle cx="20" cy="26" r="15" fill="#34A853" opacity="0.9" />
              <circle cx="12" cy="32" r="9" fill="#2F9E4F" opacity="0.85" />
            </>
          ) : (
            <>
              <rect x="18" y="30" width="5" height="28" rx="2.5" fill="#B45309" />
              <path d="M20 30c-10-6-16-2-18 2 6-2 12 0 18 4zM20 30c10-6 16-2 18 2-6-2-12 0-18 4z" fill="#16A34A" />
            </>
          )}
        </svg>
      ))}
      {/* bitiş çizgisi */}
      <div className="absolute bottom-10 right-4 h-16 w-3 bg-[repeating-linear-gradient(180deg,#111827_0_6px,#fff_6px_12px)]" />
      {/* koşucu */}
      <div
        className="absolute bottom-8 transition-all duration-500 ease-out"
        style={{ left: `calc(4% + ${pct * 82}%)` }}
      >
        <Climber size={54} mood="happy" className="anim-bob" />
      </div>
    </div>
  );
}

/* ============================================================== MARKET */

const ITEM_SHAPES: Record<string, React.ReactNode> = {
  bread: <><ellipse cx="24" cy="26" rx="18" ry="12" fill="#D9A05B" /><path d="M10 22c4-6 24-6 28 0" stroke="#B4762F" strokeWidth="2.5" fill="none" /></>,
  milk: <><rect x="14" y="10" width="20" height="28" rx="4" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="2" /><rect x="14" y="24" width="20" height="14" fill="#BFDBFE" /></>,
  cheese: <><path d="M8 32l14-16h18v16H8z" fill="#FBBF24" /><circle cx="20" cy="26" r="2.5" fill="#F59E0B" /><circle cx="30" cy="24" r="2" fill="#F59E0B" /></>,
  apple: <><circle cx="24" cy="28" r="13" fill="#EF4444" /><path d="M24 15v-5M24 12c4-3 8-2 8-2s-1 5-6 5" stroke="#16A34A" strokeWidth="2.4" fill="none" /></>,
  banana: <><path d="M10 18c2 14 14 22 26 18-6-2-12-8-14-20-4 0-8 1-12 2z" fill="#FBBF24" /></>,
  egg: <><ellipse cx="24" cy="26" rx="11" ry="14" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="2" /></>,
  chocolate: <><rect x="12" y="14" width="24" height="22" rx="3" fill="#7C3F1D" /><path d="M20 14v22M28 14v22M12 22h24M12 29h24" stroke="#5B2E12" strokeWidth="1.6" /></>,
  notebook: <><rect x="13" y="10" width="22" height="28" rx="3" fill="#3B82F6" /><rect x="17" y="10" width="3" height="28" fill="#1D4ED8" /></>,
  pencil: <><path d="M14 34l3-8 16-16 5 5-16 16-8 3z" fill="#F59E0B" /><path d="M33 10l5 5" stroke="#B45309" strokeWidth="2.5" /></>,
  book: <><rect x="11" y="12" width="26" height="24" rx="3" fill="#8B5CF6" /><rect x="22" y="12" width="3" height="24" fill="#6D28D9" /></>,
};

export function MarketItem({ icon, name, price }: { icon: string; name: string; price: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-ink-100 bg-white px-3 py-2.5 shadow-sm">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
        {ITEM_SHAPES[icon] ?? <circle cx="24" cy="24" r="14" fill="#CBD5E1" />}
      </svg>
      <span className="text-xs font-bold text-ink-700">{name}</span>
      <span className="text-xs font-black text-mint-600">{price} TL</span>
    </div>
  );
}
