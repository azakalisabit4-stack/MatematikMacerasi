"use client";

import { cn } from "@/lib/utils";

/**
 * Tamamen SVG ile çizilmiş, emoji içermeyen avatar seti.
 * 12 farklı karakter: ten tonu, saç stili, saç rengi ve aksesuar kombinasyonları.
 */

const SKIN = ["#F7D3B4", "#EFC09A", "#D9A377", "#B57C51", "#8C5A36", "#FBE0C8"];
const HAIR = ["#3B2A21", "#6B4226", "#A8622B", "#1F2937", "#D9A441", "#8B4513", "#4B5563"];
const BG: Array<[string, string]> = [
  ["#DBEAFE", "#93C5FD"],
  ["#DCFCE7", "#86EFAC"],
  ["#FEF3C7", "#FCD34D"],
  ["#FCE7F3", "#F9A8D4"],
  ["#EDE9FE", "#C4B5FD"],
  ["#CFFAFE", "#67E8F9"],
  ["#FFE4E6", "#FDA4AF"],
  ["#E0E7FF", "#A5B4FC"],
];

interface Config {
  skin: string;
  hair: string;
  bg: [string, string];
  style: 0 | 1 | 2 | 3 | 4;
  accessory: "none" | "glasses" | "cap" | "band" | "helmet" | "hat";
  shirt: string;
}

const CONFIGS: Record<string, Config> = {
  "avatar-01": { skin: SKIN[0], hair: HAIR[1], bg: BG[0], style: 0, accessory: "none", shirt: "#3568F0" },
  "avatar-02": { skin: SKIN[1], hair: HAIR[0], bg: BG[1], style: 1, accessory: "none", shirt: "#10B981" },
  "avatar-03": { skin: SKIN[5], hair: HAIR[4], bg: BG[2], style: 2, accessory: "glasses", shirt: "#F59E0B" },
  "avatar-04": { skin: SKIN[2], hair: HAIR[3], bg: BG[3], style: 1, accessory: "band", shirt: "#EC4899" },
  "avatar-05": { skin: SKIN[3], hair: HAIR[5], bg: BG[4], style: 3, accessory: "glasses", shirt: "#8B5CF6" },
  "avatar-06": { skin: SKIN[0], hair: HAIR[2], bg: BG[5], style: 0, accessory: "cap", shirt: "#06B6D4" },
  "avatar-07": { skin: SKIN[4], hair: HAIR[0], bg: BG[6], style: 2, accessory: "helmet", shirt: "#F43F5E" },
  "avatar-08": { skin: SKIN[1], hair: HAIR[6], bg: BG[7], style: 4, accessory: "glasses", shirt: "#6366F1" },
  "avatar-09": { skin: SKIN[5], hair: HAIR[3], bg: BG[4], style: 3, accessory: "hat", shirt: "#7C3AED" },
  "avatar-10": { skin: SKIN[2], hair: HAIR[1], bg: BG[0], style: 1, accessory: "helmet", shirt: "#0EA5E9" },
  "avatar-11": { skin: SKIN[3], hair: HAIR[4], bg: BG[2], style: 4, accessory: "hat", shirt: "#D97706" },
  "avatar-12": { skin: SKIN[4], hair: HAIR[5], bg: BG[6], style: 2, accessory: "helmet", shirt: "#DC2626" },
};

const FRAMES: Record<string, { ring: string; glow: string } | null> = {
  "frame-none": null,
  "frame-gold": { ring: "url(#mm-frame-gold)", glow: "#F59E0B" },
  "frame-emerald": { ring: "url(#mm-frame-emerald)", glow: "#10B981" },
  "frame-violet": { ring: "url(#mm-frame-violet)", glow: "#8B5CF6" },
  "frame-flame": { ring: "url(#mm-frame-flame)", glow: "#F97316" },
};

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 1: // kısa dalgalı
      return (
        <path
          d="M22 44c0-14 10-24 26-24s26 10 26 24c0 4-2 6-4 6-3-8-9-12-22-12s-19 4-22 12c-2 0-4-2-4-6z"
          fill={color}
        />
      );
    case 2: // uzun saç
      return (
        <>
          <path d="M20 46c0-16 11-26 28-26s28 10 28 26v22c0 4-3 6-6 4-2-2-2-8-2-14 0-10-6-16-20-16s-20 6-20 16c0 6 0 12-2 14-3 2-6 0-6-4V46z" fill={color} />
        </>
      );
    case 3: // kabarık
      return (
        <path
          d="M24 42c0-15 10-24 24-24s24 9 24 24c0 5-3 9-6 9 1-9-6-15-18-15s-19 6-18 15c-3 0-6-4-6-9z"
          fill={color}
        />
      );
    case 4: // topuz
      return (
        <>
          <circle cx="48" cy="16" r="9" fill={color} />
          <path d="M22 46c0-15 11-24 26-24s26 9 26 24c0 4-2 6-4 6-3-9-9-13-22-13s-19 4-22 13c-2 0-4-2-4-6z" fill={color} />
        </>
      );
    default: // düz kısa
      return (
        <path d="M23 45c0-14 11-24 25-24s25 10 25 24c0 3-1 5-3 5-2-9-10-13-22-13s-20 4-22 13c-2 0-3-2-3-5z" fill={color} />
      );
  }
}

function Accessory({ kind, color }: { kind: Config["accessory"]; color: string }) {
  switch (kind) {
    case "glasses":
      return (
        <g>
          <circle cx="38" cy="52" r="9" fill="#fff" fillOpacity="0.35" stroke="#334155" strokeWidth="2.4" />
          <circle cx="58" cy="52" r="9" fill="#fff" fillOpacity="0.35" stroke="#334155" strokeWidth="2.4" />
          <path d="M47 52h2" stroke="#334155" strokeWidth="2.4" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M22 42c0-14 11-23 26-23s26 9 26 23H22z" fill={color} />
          <path d="M18 42h34v6H22c-3 0-4-3-4-6z" fill={color} opacity="0.85" />
        </g>
      );
    case "band":
      return <path d="M23 40h50c1 3 1 5 1 7H22c0-2 0-4 1-7z" fill="#EF4444" />;
    case "helmet":
      return (
        <g>
          <path d="M20 48c0-17 12-28 28-28s28 11 28 28v3H20v-3z" fill={color} />
          <rect x="18" y="47" width="60" height="7" rx="3.5" fill="#fff" fillOpacity="0.5" />
        </g>
      );
    case "hat":
      return (
        <g>
          <path d="M48 6l16 36H32L48 6z" fill={color} />
          <ellipse cx="48" cy="43" rx="24" ry="6" fill={color} opacity="0.9" />
          <circle cx="48" cy="12" r="3.4" fill="#FDE68A" />
        </g>
      );
    default:
      return null;
  }
}

export function Avatar({
  avatarKey = "avatar-01",
  frameKey = "frame-none",
  size = 48,
  online,
  className,
}: {
  avatarKey?: string;
  frameKey?: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const cfg = CONFIGS[avatarKey] ?? CONFIGS["avatar-01"];
  const frame = FRAMES[frameKey] ?? null;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} role="img" aria-label="Avatar">
        <defs>
          <linearGradient id={`bg-${avatarKey}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.bg[0]} />
            <stop offset="100%" stopColor={cfg.bg[1]} />
          </linearGradient>
          <linearGradient id="mm-frame-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="mm-frame-emerald" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="mm-frame-violet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="mm-frame-flame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <clipPath id={`clip-${avatarKey}`}>
            <circle cx="48" cy="48" r="42" />
          </clipPath>
        </defs>

        <circle cx="48" cy="48" r="46" fill="#fff" />
        <g clipPath={`url(#clip-${avatarKey})`}>
          <circle cx="48" cy="48" r="42" fill={`url(#bg-${avatarKey})`} />
          {/* gövde */}
          <path d="M12 96c0-16 16-26 36-26s36 10 36 26H12z" fill={cfg.shirt} />
          <path d="M40 72c2 5 5 8 8 8s6-3 8-8l-8-4-8 4z" fill={cfg.skin} />
          {/* boyun */}
          <rect x="41" y="62" width="14" height="12" rx="6" fill={cfg.skin} />
          {/* yüz */}
          <ellipse cx="48" cy="50" rx="21" ry="23" fill={cfg.skin} />
          {/* kulaklar */}
          <circle cx="27" cy="52" r="4.5" fill={cfg.skin} />
          <circle cx="69" cy="52" r="4.5" fill={cfg.skin} />
          <Hair style={cfg.style} color={cfg.hair} />
          {/* gözler */}
          <ellipse cx="40" cy="51" rx="3.2" ry="3.8" fill="#1F2937" />
          <ellipse cx="56" cy="51" rx="3.2" ry="3.8" fill="#1F2937" />
          <circle cx="41.2" cy="49.8" r="1.1" fill="#fff" />
          <circle cx="57.2" cy="49.8" r="1.1" fill="#fff" />
          {/* yanaklar */}
          <ellipse cx="34" cy="58" rx="4" ry="2.6" fill="#F87171" opacity="0.35" />
          <ellipse cx="62" cy="58" rx="4" ry="2.6" fill="#F87171" opacity="0.35" />
          {/* ağız */}
          <path d="M41 60c2 3.2 4.4 4.6 7 4.6s5-1.4 7-4.6" stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <Accessory kind={cfg.accessory} color={cfg.shirt} />
        </g>

        {frame ? (
          <circle cx="48" cy="48" r="44" fill="none" stroke={frame.ring} strokeWidth="5" />
        ) : (
          <circle cx="48" cy="48" r="44" fill="none" stroke="#E2E8F0" strokeWidth="3" />
        )}
      </svg>

      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white",
            online ? "bg-emerald-500" : "bg-slate-300",
          )}
          style={{ width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24) }}
          aria-label={online ? "Çevrimiçi" : "Çevrimdışı"}
        />
      )}
    </span>
  );
}
