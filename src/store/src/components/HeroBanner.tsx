import React from 'react';
import { ArrowRight, Star, Zap } from 'lucide-react';

interface HeroBannerProps {
  onExploreClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick }) => {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--pink-950) 0%, var(--pink-900) 50%, #1a0510 100%)',
        color: '#ffffff',
        padding: 'clamp(1.75rem, 3vw, 3rem)',
        boxShadow: 'var(--shadow-lg), var(--shadow-accent)',
        marginBottom: '2rem',
      }}
    >
      {/* Decorative Glow Elements */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244, 114, 182, 0.25) 0%, rgba(219, 39, 119, 0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--border-radius-pill)',
            background: 'rgba(244, 114, 182, 0.15)',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            color: 'var(--pink-300)',
            fontSize: 'var(--fz-2xs)',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          <Zap size={14} color="var(--pink-400)" />
          <span>Vayyari Optics Collection 2026</span>
        </div>

        {/* Title using Clamp Typography */}
        <h1
          style={{
            fontSize: 'var(--fz-hero)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#fdf2f8',
            marginBottom: '1rem',
          }}
        >
          Mastery in Vision & Precision Light Engineering
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'var(--fz-base)',
            color: 'var(--pink-100)',
            opacity: 0.9,
            lineHeight: 1.6,
            marginBottom: '1.75rem',
            maxWidth: '560px',
          }}
        >
          Engineered with Vayyari Nanometre anti-reflective coating, chromatic fidelity tuning, and ultralight aerospace titanium.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={onExploreClick} className="btn-pink" style={{ padding: '0.85rem 1.6rem', fontSize: 'var(--fz-sm)' }}>
            <span>Explore Precision Optics</span>
            <ArrowRight size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85 }}>
            <Star size={16} fill="var(--pink-400)" color="var(--pink-400)" />
            <span style={{ fontSize: 'var(--fz-xs)', fontWeight: 600, color: 'var(--pink-200)' }}>
              4.98 Rating from 12,400+ Practitioners
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
