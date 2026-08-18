export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Matematik Macerası">
        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B8FFB" />
            <stop offset="55%" stopColor="#3568F0" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="logo-sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE288" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#logo-bg)" />
        <circle cx="46" cy="18" r="7" fill="url(#logo-sun)" />
        <path d="M6 46c6-2 9-8 14-8s7 5 12 5 8-7 14-7c4 0 8 3 12 5v21H6V46z" fill="#fff" fillOpacity="0.22" />
        <g fill="#fff">
          <rect x="13" y="28" width="14" height="3.6" rx="1.8" />
          <rect x="18.2" y="22.8" width="3.6" height="14" rx="1.8" />
          <rect x="35" y="34" width="15" height="3.6" rx="1.8" />
          <rect x="35" y="42" width="15" height="3.6" rx="1.8" />
          <circle cx="20" cy="46" r="3.4" />
        </g>
      </svg>
      {withText && (
        <span className="leading-none">
          <span className="block text-[15px] font-black tracking-tight text-white">MATEMATİK</span>
          <span className="block text-[15px] font-black tracking-[0.18em] text-sun-300">MACERASI</span>
        </span>
      )}
    </span>
  );
}
