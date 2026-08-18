import { LEAGUE_BY_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Her lig için elle çizilmiş SVG rozet — emoji yok. */
export function LeagueBadge({
  leagueKey,
  size = 40,
  className,
  withShine = true,
}: {
  leagueKey: string;
  size?: number;
  className?: string;
  withShine?: boolean;
}) {
  const league = LEAGUE_BY_KEY[leagueKey];
  const [c1, c2] = league?.colors ?? ["#CBD5E1", "#94A3B8"];
  const accent = league?.accent ?? "#64748B";
  const order = league?.order ?? 1;
  const gid = `lg-${leagueKey}`;

  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={(size * 72) / 64}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={league?.name ?? "Lig"}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`${gid}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.65" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* kalkan gövdesi */}
      <path
        d="M32 2 60 11v25c0 16-11 28-28 34C15 64 4 52 4 36V11L32 2z"
        fill={`url(#${gid})`}
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {withShine && (
        <path d="M32 2 60 11v25c0 16-11 28-28 34V2z" fill={`url(#${gid}-shine)`} opacity="0.55" />
      )}

      {/* iç çerçeve */}
      <path
        d="M32 9 53 16v20c0 12.5-8.6 22-21 27C19.6 58 11 48.5 11 36V16L32 9z"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="1.6"
      />

      {/* lig simgesi */}
      {order <= 3 && (
        <g fill="#fff" fillOpacity="0.95">
          <circle cx="32" cy="34" r="9" fill="#fff" fillOpacity="0.25" />
          <path d="M32 24l2.6 6.6 7 .4-5.4 4.6 1.8 6.9L32 38.6 26 42.5l1.8-6.9-5.4-4.6 7-.4L32 24z" />
        </g>
      )}
      {order >= 4 && order <= 5 && (
        <g>
          <path
            d="M32 21l3.4 8.6 9.2.5-7.1 6 2.3 9L32 39.9 24.2 45l2.3-9-7.1-6 9.2-.5L32 21z"
            fill="#fff"
            fillOpacity="0.95"
          />
        </g>
      )}
      {order === 6 && (
        <g>
          <path d="M32 20l12 12-12 15-12-15 12-12z" fill="#fff" fillOpacity="0.92" />
          <path d="M32 20l12 12H20l12-12z" fill="#fff" fillOpacity="0.6" />
        </g>
      )}
      {order === 7 && (
        <g fill="#fff" fillOpacity="0.95">
          <path d="M18 42l-3-18 9 7 8-11 8 11 9-7-3 18H18z" />
          <rect x="18" y="44" width="28" height="4" rx="2" />
        </g>
      )}
      {order === 8 && (
        <g fill="#fff" fillOpacity="0.96">
          <path d="M17 44l-4-22 10 8 9-13 9 13 10-8-4 22H17z" />
          <rect x="17" y="46" width="30" height="5" rx="2.5" />
          <circle cx="23" cy="30" r="2.2" />
          <circle cx="32" cy="26" r="2.4" />
          <circle cx="41" cy="30" r="2.2" />
        </g>
      )}
    </svg>
  );
}

export function LeagueChip({
  leagueKey,
  points,
  className,
}: {
  leagueKey: string;
  points?: number;
  className?: string;
}) {
  const league = LEAGUE_BY_KEY[leagueKey];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 shadow-sm",
        className,
      )}
    >
      <LeagueBadge leagueKey={leagueKey} size={20} />
      <span>{league?.name ?? "Lig"}</span>
      {points !== undefined && <span className="text-ink-400">· {points}</span>}
    </span>
  );
}
