import React from 'react';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'full' | 'icon-only' | 'horizontal' | 'dark' | 'light';
  className?: string;
  theme?: 'dark' | 'light';
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * EducationEmblemSvg: Handcrafted high-DPI vector SVG depicting academic education:
 * - 3D Graduation Mortarboard Regalia with hanging golden tassel & skull cap
 * - Open Academic Book with spread pages of knowledge & ribbon bookmark
 * - Laurel Wreaths of Academic Honor & Distinction
 * - Radiant Beacon Star of Wisdom at the top
 * - High-contrast Midnight Navy & Regal Gold metallic palette
 */
export const EducationEmblemSvg: React.FC<{
  dimension?: number;
  size?: number;
  className?: string;
}> = ({ dimension = 44, size, className = '' }) => {
  const actualDimension = size ?? dimension;
  return (
    <svg
      width={actualDimension}
      height={actualDimension}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md select-none ${className}`}
      aria-label="Education Academic Logo"
    >
      <defs>
        {/* Deep Royal Midnight Navy Base */}
        <linearGradient id="eduNavyBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="45%" stopColor="#111C44" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        {/* Regal Metallic Gold Gradient */}
        <linearGradient id="eduRegalGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="20%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Warm Amber Accent Highlight */}
        <linearGradient id="eduGoldStroke" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Book Pages Luminous Gradient */}
        <linearGradient id="eduPageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Subtle Radial Warmth in Center */}
        <radialGradient id="eduCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background Academic Rounded Shield / Tile */}
      <rect width="200" height="200" rx="44" fill="url(#eduNavyBg)" />
      <circle cx="100" cy="100" r="76" fill="url(#eduCenterGlow)" />

      {/* Double Gold Contour Frame */}
      <rect
        x="6"
        y="6"
        width="188"
        height="188"
        rx="38"
        fill="none"
        stroke="url(#eduRegalGold)"
        strokeWidth="2.5"
      />
      <rect
        x="13"
        y="13"
        width="174"
        height="174"
        rx="32"
        fill="none"
        stroke="url(#eduGoldStroke)"
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeDasharray="4 3"
      />

      {/* Flanking Laurels of Academic Excellence */}
      {/* Left Laurel Branch */}
      <path
        d="M 28 140 C 22 110 26 80 40 58"
        fill="none"
        stroke="url(#eduRegalGold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path d="M 27 126 C 20 124 20 116 26 116 C 30 116 30 123 27 126 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 25 106 C 17 103 17 96 25 96 C 29 96 28 103 25 106 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 28 88 C 21 84 22 77 29 78 C 33 78 32 85 28 88 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 36 70 C 29 65 31 58 38 60 C 42 61 41 68 36 70 Z" fill="url(#eduRegalGold)" opacity="0.85" />

      {/* Right Laurel Branch */}
      <path
        d="M 172 140 C 178 110 174 80 160 58"
        fill="none"
        stroke="url(#eduRegalGold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path d="M 173 126 C 180 124 180 116 174 116 C 170 116 170 123 173 126 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 175 106 C 183 103 183 96 175 96 C 171 96 172 103 175 106 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 172 88 C 179 84 178 77 171 78 C 167 78 168 85 172 88 Z" fill="url(#eduRegalGold)" opacity="0.85" />
      <path d="M 164 70 C 171 65 169 58 162 60 C 158 61 159 68 164 70 Z" fill="url(#eduRegalGold)" opacity="0.85" />

      {/* Star of Academic Wisdom at top center */}
      <polygon
        points="100,19 102.5,24.5 108,25 103.8,28.8 105,34.5 100,31.5 95,34.5 96.2,28.8 92,25 97.5,24.5"
        fill="url(#eduRegalGold)"
      />

      {/* ============================================== */}
      {/* 1. GRADUATION MORTARBOARD CAP (ACADEMIC REGALIA) */}
      {/* ============================================== */}
      <g id="mortarboard-cap">
        {/* Skull Cap Base (depth under diamond top) */}
        <path
          d="M 68 54 Q 100 68 132 54 L 132 70 C 132 85 68 85 68 70 Z"
          fill="#0c1633"
          stroke="url(#eduRegalGold)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Left Facet of Diamond Top (Subtle contrast) */}
        <polygon
          points="100,32 40,50 100,68"
          fill="#D97706"
          fillOpacity="0.9"
        />

        {/* Right Facet of Diamond Top (Radiant gold) */}
        <polygon
          points="100,32 160,50 100,68"
          fill="url(#eduRegalGold)"
        />

        {/* Outer Rim of Diamond Cap */}
        <polygon
          points="100,32 160,50 100,68 40,50"
          fill="none"
          stroke="#FFFBEB"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Center Button On Cap Crown */}
        <ellipse cx="100" cy="50" rx="4.5" ry="3" fill="#FFFBEB" stroke="#B45309" strokeWidth="1" />

        {/* Flowing Golden Academic Tassel */}
        <path
          d="M 100 50 C 66 52 50 64 48 76 C 46 84 48 94 48 97"
          fill="none"
          stroke="url(#eduRegalGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Tassel Knot / Bead */}
        <ellipse cx="48" cy="98" rx="3.5" ry="2" fill="#FFFBEB" />
        {/* Tassel Fringe */}
        <path
          d="M 45 100 L 43 114 M 48 100 L 48 116 M 51 100 L 53 114"
          stroke="url(#eduRegalGold)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* ============================================== */}
      {/* 2. OPEN ACADEMIC BOOK (KNOWLEDGE & LEARNING)   */}
      {/* ============================================== */}
      <g id="open-academic-book">
        {/* Undercover / Book Binding Shadow Base */}
        <path
          d="M 100 148 C 66 140 44 142 36 145 L 36 109 C 44 106 66 104 100 112 Z"
          fill="#0B132B"
          stroke="url(#eduRegalGold)"
          strokeWidth="2"
        />
        <path
          d="M 100 148 C 134 140 156 142 164 145 L 164 109 C 156 106 134 104 100 112 Z"
          fill="#0B132B"
          stroke="url(#eduRegalGold)"
          strokeWidth="2"
        />

        {/* Main Left Page Spread */}
        <path
          d="M 100 144 C 68 136 46 138 40 141 L 40 106 C 46 103 68 101 100 108 Z"
          fill="url(#eduPageGrad)"
          stroke="url(#eduGoldStroke)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Main Right Page Spread */}
        <path
          d="M 100 144 C 132 136 154 138 160 141 L 160 106 C 154 103 132 101 100 108 Z"
          fill="url(#eduPageGrad)"
          stroke="url(#eduGoldStroke)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Left Page Knowledge Lines / Math Formulations */}
        <path d="M 52 116 C 66 114 82 115 90 118" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M 50 124 C 64 122 80 123 90 126" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M 52 132 C 66 130 82 131 90 134" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

        {/* Right Page Knowledge Lines / Assessment Content */}
        <path d="M 110 118 C 118 115 134 114 148 116" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M 110 126 C 120 123 136 122 150 124" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M 110 134 C 118 131 134 130 148 132" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

        {/* Bookmark Ribbon Hanging from Spine */}
        <path
          d="M 98 109 L 98 155 L 103 150 L 108 155 L 108 111"
          fill="url(#eduRegalGold)"
          stroke="#92400E"
          strokeWidth="0.8"
        />
      </g>

      {/* ============================================== */}
      {/* 3. BASE BANNER (MCQ ASSESSMENT HUB)            */}
      {/* ============================================== */}
      <rect
        x="42"
        y="160"
        width="116"
        height="24"
        rx="6"
        fill="#080F24"
        stroke="url(#eduRegalGold)"
        strokeWidth="1.4"
      />
      <text
        x="100"
        y="173"
        textAnchor="middle"
        fontFamily="'Cinzel', 'Playfair Display', Georgia, serif"
        fontWeight="900"
        fontSize="10.5"
        letterSpacing="2.5"
        fill="url(#eduRegalGold)"
      >
        MCQ
      </text>
      <text
        x="100"
        y="181"
        textAnchor="middle"
        fontFamily="'Outfit', 'Plus Jakarta Sans', sans-serif"
        fontWeight="700"
        fontSize="5"
        letterSpacing="1.8"
        fill="#FFFFFF"
        fillOpacity="0.95"
      >
        ASSESSMENT HUB
      </text>
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  className = '',
  theme = 'light',
  showSubtitle = true,
  subtitle,
}) => {
  // Normalize if variant was passed as 'dark' or 'light'
  const effectiveTheme: 'dark' | 'light' =
    variant === 'dark' ? 'dark' : variant === 'light' ? 'light' : theme === 'dark' ? 'dark' : 'light';
  const effectiveVariant: 'full' | 'icon-only' | 'horizontal' =
    variant === 'dark' || variant === 'light'
      ? 'horizontal'
      : variant === 'full'
      ? 'full'
      : variant === 'icon-only'
      ? 'icon-only'
      : 'horizontal';

  const getDimension = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs':
        return 26;
      case 'sm':
        return 34;
      case 'md':
        return 44;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
      default:
        return 44;
    }
  };

  const dim = getDimension();

  // 1. Icon-Only Mode (Perfect for badges, tab banners, button prefixes)
  if (effectiveVariant === 'icon-only') {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <EducationEmblemSvg dimension={dim} />
      </span>
    );
  }

  // 2. Full Stacked Mode (Hero headers, major modal covers, sidebar displays)
  if (effectiveVariant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center text-center select-none ${className}`}>
        <EducationEmblemSvg dimension={dim >= 64 ? dim : 64} />
        <div className="mt-3 space-y-0.5">
          <div
            className="font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 drop-shadow-sm"
            style={{
              fontSize: size === 'xl' ? '2.4rem' : size === 'lg' ? '1.85rem' : '1.4rem',
              letterSpacing: '0.12em',
            }}
          >
            MCQ
          </div>
          <div
            className={`font-serif tracking-[0.24em] uppercase font-bold ${
              effectiveTheme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
            style={{
              fontSize: size === 'xl' ? '0.95rem' : size === 'lg' ? '0.78rem' : '0.65rem',
            }}
          >
            ASSESSMENT HUB
          </div>
          {showSubtitle && (
            <p
              className={`text-[11px] font-sans font-medium mt-1 ${
                effectiveTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {subtitle || 'Digital Mathematics & Academic Evaluation'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3. Horizontal Mode (Emblem on left + Title on right - Default everywhere)
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none min-w-0 ${className}`}>
      <div className="shrink-0 flex items-center justify-center">
        <EducationEmblemSvg dimension={dim} />
      </div>
      <div className="flex flex-col justify-center text-left min-w-0">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className="font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 leading-none text-sm sm:text-base md:text-lg"
          >
            MCQ
          </span>
          <span
            className={`font-serif font-bold tracking-[0.16em] sm:tracking-[0.22em] uppercase leading-none text-[10px] sm:text-xs md:text-sm ${
              effectiveTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            ASSESSMENT HUB
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`font-sans tracking-wide text-[9px] sm:text-[11px] font-medium leading-tight mt-0.5 hidden sm:block truncate max-w-[250px] ${
              effectiveTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subtitle || 'Digital Mathematics & Academic Evaluation'}
          </span>
        )}
      </div>
    </div>
  );
};

