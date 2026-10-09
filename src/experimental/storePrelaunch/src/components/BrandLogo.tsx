import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', align = 'left' }) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const titleSize = isLarge ? '2.4rem' : isSmall ? '1.5rem' : '2rem';
  const subSize = isLarge ? '0.66rem' : isSmall ? '0.5rem' : '0.58rem';
  const subTracking = isLarge ? '0.48em' : '0.42em';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* VAYYARI in Radiant Neon Gold Haute Couture Serif */}
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: titleSize,
          fontWeight: 700,
          letterSpacing: '0.22em',
          lineHeight: 1,
          color: '#fff9e6',
          textShadow:
            '0 0 2px #ffffff, 0 0 8px #ffd23f, 0 0 18px rgba(255, 195, 30, 0.85), 0 0 36px rgba(245, 160, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.95)',
          display: 'block',
        }}
      >
        VAYYARI
      </span>

      {/* FASHIONS in refined luminous tracking below */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: subSize,
          fontWeight: 600,
          letterSpacing: subTracking,
          textTransform: 'uppercase',
          color: '#ffe599',
          marginTop: '6px',
          marginLeft: align === 'center' ? 0 : '3px',
          display: 'block',
          lineHeight: 1,
          textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.9)',
        }}
      >
        FASHIONS
      </span>
    </div>
  );
};
