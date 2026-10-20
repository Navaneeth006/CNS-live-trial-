import React from 'react';

interface CsnLiveLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
  subtext?: string;
  variant?: 'auto' | 'dark' | 'light';
}

export const CsnLiveLogo: React.FC<CsnLiveLogoProps> = ({
  className = '',
  size = 'md',
  showSubtext = false,
  subtext,
  variant = 'auto',
}) => {
  const sizeClasses = {
    sm: {
      svgH: 'h-7',
      textCsn: 'text-lg',
      textLive: 'text-lg',
      subText: 'text-[9px]',
    },
    md: {
      svgH: 'h-9',
      textCsn: 'text-xl',
      textLive: 'text-xl',
      subText: 'text-[11px]',
    },
    lg: {
      svgH: 'h-12',
      textCsn: 'text-2xl sm:text-3xl',
      textLive: 'text-2xl sm:text-3xl',
      subText: 'text-xs',
    },
    xl: {
      svgH: 'h-16',
      textCsn: 'text-4xl sm:text-5xl',
      textLive: 'text-4xl sm:text-5xl',
      subText: 'text-sm',
    },
  }[size];

  // Determine text color for CSN based on variant/theme
  const csnTextColor =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
      ? 'text-[#111413]'
      : 'text-[#111413] dark:text-white';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Graphic with the CSN.Live triangular rack & neon red branding */}
      <div className={`relative flex items-center justify-center ${sizeClasses.svgH}`}>
        <svg
          viewBox="0 0 240 85"
          className="h-full w-auto overflow-visible drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Red Rack Outline (Tilted triangle with rounded corners and right-edge dot) */}
          <path
            d="M 85 46 L 140 18 C 146 15 152 19 152 26 L 152 35"
            stroke="#FF002B"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="152" cy="42.5" r="4.5" fill="#FF002B" />
          <path
            d="M 152 50 L 152 64 C 152 71 145 75 139 72 L 95 50"
            stroke="#FF002B"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Vertex rounding cap */}
          <path
            d="M 95 50 C 90 48 90 48 85 46"
            stroke="#FF002B"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Foreground Brand Typography: CSN in adaptive white/black, .Live in vibrant red */}
          <g style={{ fontFamily: 'Inter, Space Grotesk, system-ui, sans-serif' }}>
            {/* CSN */}
            <text
              x="20"
              y="58"
              fontSize="46"
              fontWeight="900"
              letterSpacing="-1.5"
              className={csnTextColor}
              fill="currentColor"
            >
              CSN
            </text>
            {/* .Live */}
            <text
              x="115"
              y="58"
              fontSize="46"
              fontWeight="800"
              letterSpacing="-1"
              fill="#FF002B"
            >
              .Live
            </text>
          </g>
        </svg>
      </div>

      {showSubtext && (
        <div className="hidden sm:block text-left">
          <p className={`${sizeClasses.subText} text-[#5A635E] dark:text-[#9BA3A0] font-medium leading-tight truncate max-w-[200px]`}>
            {subtext || 'Live Arena & Scoring'}
          </p>
        </div>
      )}
    </div>
  );
};
