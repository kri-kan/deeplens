import React from 'react';
import { Play, Pause } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { sounds } from '../utils/audio';

interface HeroSectionProps {
  isPlaying: boolean;
  onToggleVideo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isPlaying, onToggleVideo }) => {
  return (
    <section
      aria-label="Hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'transparent',
      }}
    >
      {/* Top Brand Logo */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '36px 32px 0',
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <BrandLogo size="md" align="left" />
      </div>

      {/* Hero Narrative - exact labels as in original */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '60px 32px',
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          {/* Eyebrow Label - exact original text */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.38em',
              color: 'var(--gold)',
              marginBottom: '24px',
              textTransform: 'uppercase',
            }}
          >
            COMING SOON
          </p>

          {/* Heading - exact original text */}
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.8rem, 6.8vw, 5.5rem)',
              lineHeight: 1.05,
              fontWeight: 700,
              color: 'var(--text-ivory)',
              marginBottom: '20px',
              letterSpacing: '-0.01em',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.85)',
            }}
          >
            A New Era of Elegance is Unfolding
          </h1>

          {/* Gold Divider Line - 320px gradient line as in original */}
          <div
            style={{
              height: '1px',
              width: '320px',
              maxWidth: '100%',
              background: 'linear-gradient(90deg, var(--gold), transparent)',
              marginBottom: '24px',
            }}
          />

          {/* Subtitle - exact original text */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              fontWeight: 300,
              lineHeight: 1.7,
              color: 'rgba(250, 238, 226, 0.88)',
              maxWidth: '440px',
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.8)',
            }}
          >
            Premium ethnic wear, crafted for the woman who knows her worth.
          </p>
        </div>
      </div>

      {/* Bottom Scroll Cue (centered as in original) and Video Icon aside */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '0 32px 36px',
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Centered Scroll Cue as in original: vertical line + chevron */}
        <a
          href="#waitlist"
          onClick={() => sounds.playTick()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
            color: 'var(--gold)',
            opacity: 0.85,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
        >
          <div
            style={{
              width: '1px',
              height: '40px',
              background: 'linear-gradient(to bottom, transparent, var(--gold))',
            }}
          />
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            aria-hidden="true"
            style={{ marginTop: '2px' }}
          >
            <path
              d="M1 1L6 6L11 1"
              stroke="var(--gold)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </a>

        {/* Minimalist circular video control icon tucked aside */}
        <button
          onClick={onToggleVideo}
          style={{
            position: 'absolute',
            right: '32px',
            bottom: '36px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(10, 3, 5, 0.45)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            color: 'var(--gold-champagne)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          title={isPlaying ? 'Pause Video' : 'Play Video'}
          aria-label={isPlaying ? 'Pause Video' : 'Play Video'}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--gold)';
            e.currentTarget.style.color = 'var(--gold-bright)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)';
            e.currentTarget.style.color = 'var(--gold-champagne)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '2px' }} />}
        </button>
      </div>
    </section>
  );
};
