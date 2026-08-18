"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ BUTON */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warm" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_6px_0_-1px_rgba(29,62,177,0.55)] hover:from-brand-300 hover:to-brand-500 active:translate-y-[2px] active:shadow-[0_3px_0_-1px_rgba(29,62,177,0.55)]",
  secondary:
    "bg-white text-ink-700 border border-ink-200 shadow-sm hover:bg-ink-50 active:translate-y-[1px]",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-50",
  danger:
    "bg-gradient-to-b from-coral-400 to-coral-600 text-white shadow-[0_6px_0_-1px_rgba(185,28,28,0.5)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_-1px_rgba(185,28,28,0.5)]",
  success:
    "bg-gradient-to-b from-mint-400 to-mint-600 text-white shadow-[0_6px_0_-1px_rgba(5,150,105,0.5)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_-1px_rgba(5,150,105,0.5)]",
  warm:
    "bg-gradient-to-b from-sun-300 to-sun-500 text-ink-900 shadow-[0_6px_0_-1px_rgba(180,83,9,0.45)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_-1px_rgba(180,83,9,0.45)]",
  dark: "bg-ink-800 text-white hover:bg-ink-700 active:translate-y-[1px]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-6 text-lg rounded-2xl gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : icon}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------- KART */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(26,37,64,0.04),0_10px_30px_-18px_rgba(26,37,64,0.35)]",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink-900 sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- İLERLEME */

export function ProgressBar({
  value,
  max = 1,
  className,
  barClassName,
  height = 10,
  gradient = "linear-gradient(90deg,#5B8FFB,#3568F0)",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  height?: number;
  gradient?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-ink-100", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barClassName)}
        style={{ width: `${pct}%`, background: gradient }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ GİRDİ */

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, icon, className, ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-ink-600">{label}</span>}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "h-12 w-full rounded-2xl border bg-white px-4 text-[15px] text-ink-800 placeholder:text-ink-300",
            "transition focus:outline-none focus:ring-4",
            error
              ? "border-coral-400 focus:border-coral-500 focus:ring-coral-100"
              : "border-ink-200 focus:border-brand-400 focus:ring-brand-100",
            icon && "pl-11",
            className,
          )}
          {...rest}
        />
      </span>
      {error ? (
        <span className="mt-1.5 block text-sm font-medium text-coral-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
});

/* ------------------------------------------------------------------ ROZET */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "mint" | "sun" | "coral" | "grape";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-50 text-ink-600 border-ink-100",
    brand: "bg-brand-50 text-brand-700 border-brand-100",
    mint: "bg-mint-100 text-mint-600 border-mint-200",
    sun: "bg-sun-50 text-sun-600 border-sun-200",
    coral: "bg-coral-100 text-coral-600 border-coral-100",
    grape: "bg-grape-100 text-grape-600 border-grape-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- BOŞLUK */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-10 text-center">
      {icon && <div className="mb-3">{icon}</div>}
      <p className="font-bold text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- MODAL */

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          "anim-pop w-full rounded-t-3xl bg-white p-5 shadow-[0_20px_60px_-20px_rgba(26,37,64,0.5)] sm:rounded-3xl sm:p-6",
          maxWidth,
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-extrabold text-ink-900">{title}</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                aria-label="Kapat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- YÜKLEME */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-brand-500", className)} size={22} />;
}

export function PageLoader({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-400">
      <Spinner className="h-7 w-7" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
