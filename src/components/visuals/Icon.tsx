"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowBigUpDash,
  ArrowDownWideNarrow,
  Award,
  Bell,
  BookOpen,
  Calculator,
  Check,
  CheckCheck,
  ClipboardList,
  Cloud,
  CloudDrizzle,
  Coins,
  Crown,
  Flag,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  Handshake,
  Hash,
  Landmark,
  Medal,
  Minus,
  Mountain,
  Plus,
  Puzzle,
  Route,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Skull,
  Sparkles,
  Sprout,
  Star,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LeagueBadge } from "./LeagueBadge";

/**
 * Uygulama genelinde kullanılan ikon kayıt defteri.
 * Tüm görseller vektör (SVG) tabanlıdır — hiçbir yerde klavye emojisi kullanılmaz.
 */
const REGISTRY: Record<string, LucideIcon> = {
  // Oyunlar
  "cloud-climb": Cloud,
  "cloud-climb-2": Mountain,
  "cloud-descend": CloudDrizzle,
  "cloud-descend-2": ArrowDownWideNarrow,
  multiply: X,
  bolt: Zap,
  puzzle: Puzzle,
  sequence: TrendingUp,
  match: Hash,
  target: Target,
  track: Route,
  cart: ShoppingCart,
  bank: Landmark,
  boss: Skull,
  game: Gamepad2,
  gamepad: Gamepad2,
  calculator: Calculator,

  // Başarım / ödül
  sprout: Sprout,
  flag: Flag,
  medal: Medal,
  mountain: Mountain,
  seven: Hash,
  "shield-check": ShieldCheck,
  "shield-star": Award,
  flame: Flame,
  "flame-star": Flame,
  "flame-crown": Crown,
  "flame-swords": Swords,
  swords: Swords,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  "star-double": Sparkles,
  "star-crown": Crown,
  coins: Coins,
  treasure: Gem,
  checklist: ClipboardList,
  users: Users,
  book: BookOpen,

  // Görev
  plus: Plus,
  minus: Minus,
  timer: Timer,
  check: Check,
  "check-all": CheckCheck,

  // Bildirim
  bell: Bell,
  "user-online": Wifi,
  "user-plus": UserPlus,
  "user-check": UserCheck,
  "user-cog": UserCog,
  "level-up": ArrowBigUpDash,
  shield: Shield,
  handshake: Handshake,
  footprints: Footprints,
};

export const TIER_STYLES: Record<string, { from: string; to: string; ring: string; text: string }> = {
  bronze: { from: "#FDE8D3", to: "#F5B784", ring: "#D97706", text: "#92400E" },
  silver: { from: "#EEF2F7", to: "#C6D2E0", ring: "#64748B", text: "#334155" },
  gold: { from: "#FEF3C7", to: "#FCD34D", ring: "#D97706", text: "#92400E" },
  diamond: { from: "#DBEAFE", to: "#A5B4FC", ring: "#4F46E5", text: "#3730A3" },
  neutral: { from: "#EEF4FF", to: "#D9E6FF", ring: "#3568F0", text: "#1D3EB1" },
};

export function MMIcon({
  name,
  size = 20,
  className,
  strokeWidth = 2.1,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  if (name.startsWith("league-")) {
    return <LeagueBadge leagueKey={name.replace("league-", "")} size={size} className={className} />;
  }
  const Cmp = REGISTRY[name] ?? Sparkles;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

/** İkonu renkli, yuvarlak bir "fayans" içinde gösterir. */
export function IconTile({
  name,
  tier = "neutral",
  size = 44,
  className,
  colors,
  muted,
}: {
  name: string;
  tier?: keyof typeof TIER_STYLES | string;
  size?: number;
  className?: string;
  colors?: { from: string; to: string; accent?: string };
  muted?: boolean;
}) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.neutral;
  const from = colors?.from ?? style.from;
  const to = colors?.to ?? style.to;
  const text = colors?.accent ?? style.text;

  if (name.startsWith("league-")) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <LeagueBadge leagueKey={name.replace("league-", "")} size={size * 0.86} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-2xl border shadow-sm transition",
        muted && "opacity-45 grayscale",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${from}, ${to})`,
        borderColor: "rgba(255,255,255,0.7)",
        color: text,
      }}
    >
      <MMIcon name={name} size={Math.round(size * 0.5)} />
    </span>
  );
}
