// Ghost icon as an inline SVG — usable anywhere as a logo mark
export function GhostIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ghost-icon-g" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
      </defs>
      <path
        d="M6 17 C6 9 10 4 16 4 C22 4 26 9 26 17 L26 27 C26 27 23.5 24.5 21 27 C18.5 29.5 16 27 16 27 C16 27 13.5 29.5 11 27 C8.5 24.5 6 27 6 27 Z"
        fill="url(#ghost-icon-g)"
      />
      <ellipse cx="12.5" cy="15.5" rx="2.5" ry="3" fill="#1e1b4b" />
      <ellipse cx="19.5" cy="15.5" rx="2.5" ry="3" fill="#1e1b4b" />
      <ellipse cx="13.2" cy="14.5" rx="1" ry="1.2" fill="white" opacity="0.9" />
      <ellipse cx="20.2" cy="14.5" rx="1" ry="1.2" fill="white" opacity="0.9" />
    </svg>
  );
}

// Full logo lockup: ghost icon + "GhostFi" wordmark
export function GhostLogo({ size = 32 }: { size?: number }) {
  const fontSize = Math.round(size * 0.75);
  return (
    <div className="flex items-center gap-2.5">
      <GhostIcon size={size} />
      <span style={{ fontSize }} className="font-black tracking-tight leading-none">
        <span className="gradient-text">Ghost</span>
        <span className="text-white">Fi</span>
      </span>
    </div>
  );
}
