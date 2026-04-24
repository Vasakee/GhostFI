// Pure CSS/SVG ghost animation — no dependencies
export function GhostAnimation() {
  const particles = [
    { angle: 0,   r: 90,  size: 3, delay: 0,    dur: 6  },
    { angle: 60,  r: 110, size: 2, delay: 0.8,  dur: 8  },
    { angle: 120, r: 80,  size: 4, delay: 1.6,  dur: 5  },
    { angle: 180, r: 100, size: 2, delay: 0.4,  dur: 7  },
    { angle: 240, r: 120, size: 3, delay: 1.2,  dur: 9  },
    { angle: 300, r: 85,  size: 2, delay: 2.0,  dur: 6  },
    { angle: 30,  r: 140, size: 2, delay: 0.6,  dur: 11 },
    { angle: 150, r: 130, size: 3, delay: 1.8,  dur: 8  },
    { angle: 270, r: 145, size: 2, delay: 1.0,  dur: 10 },
  ];

  return (
    <div className="relative flex items-center justify-center w-72 h-72 mx-auto select-none">

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg className="ring-1 absolute" width="260" height="260" viewBox="0 0 260 260">
          <ellipse cx="130" cy="130" rx="120" ry="40" fill="none" stroke="url(#ring-grad-1)" strokeWidth="1" strokeDasharray="6 10" />
          <defs>
            <linearGradient id="ring-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6C47FF" stopOpacity="0" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6C47FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <svg className="ring-2 absolute" width="220" height="220" viewBox="0 0 220 220">
          <ellipse cx="110" cy="110" rx="100" ry="30" fill="none" stroke="url(#ring-grad-2)" strokeWidth="1" strokeDasharray="4 14" />
          <defs>
            <linearGradient id="ring-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <svg className="ring-3 absolute" width="290" height="290" viewBox="0 0 290 290">
          <ellipse cx="145" cy="145" rx="138" ry="50" fill="none" stroke="url(#ring-grad-3)" strokeWidth="0.5" strokeDasharray="3 18" />
          <defs>
            <linearGradient id="ring-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6C47FF" stopOpacity="0" />
              <stop offset="50%" stopColor="#6C47FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6C47FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            animation: `particle-orbit ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            ["--start" as any]: `${p.angle}deg`,
            ["--r" as any]: `${p.r}px`,
          }}
        >
          <div
            className="rounded-full bg-purple-400"
            style={{
              width: p.size,
              height: p.size,
              animation: `particle-twinkle ${p.dur * 0.6}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 3}px #a78bfa`,
            }}
          />
        </div>
      ))}

      {/* Ghost SVG */}
      <div className="ghost-float relative z-10">
        <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ghost-body" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="60%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
            <radialGradient id="ghost-inner-glow" cx="50%" cy="35%" r="50%">
              <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
            <filter id="ghost-blur">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Shadow */}
          <ellipse cx="60" cy="134" rx="28" ry="6" fill="#6C47FF" opacity="0.25" filter="url(#ghost-blur)" />

          {/* Body */}
          <path
            d="M10 70 C10 35 30 8 60 8 C90 8 110 35 110 70 L110 115 C110 115 100 105 90 115 C80 125 70 105 60 115 C50 125 40 105 30 115 C20 125 10 115 10 115 Z"
            fill="url(#ghost-body)"
          />
          {/* Inner glow */}
          <path
            d="M10 70 C10 35 30 8 60 8 C90 8 110 35 110 70 L110 115 C110 115 100 105 90 115 C80 125 70 105 60 115 C50 125 40 105 30 115 C20 125 10 115 10 115 Z"
            fill="url(#ghost-inner-glow)"
          />

          {/* Eyes */}
          <g className="ghost-eye">
            <ellipse cx="42" cy="62" rx="10" ry="12" fill="#1e1b4b" />
            <ellipse cx="78" cy="62" rx="10" ry="12" fill="#1e1b4b" />
            {/* Eye shine */}
            <ellipse cx="45" cy="58" rx="3.5" ry="4" fill="white" opacity="0.9" />
            <ellipse cx="81" cy="58" rx="3.5" ry="4" fill="white" opacity="0.9" />
            <ellipse cx="46.5" cy="56.5" rx="1.5" ry="1.5" fill="white" />
            <ellipse cx="82.5" cy="56.5" rx="1.5" ry="1.5" fill="white" />
          </g>

          {/* Subtle smile */}
          <path d="M48 82 Q60 90 72 82" stroke="#4c1d95" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* Top highlight */}
          <ellipse cx="60" cy="28" rx="18" ry="10" fill="white" opacity="0.12" />
        </svg>
      </div>
    </div>
  );
}
