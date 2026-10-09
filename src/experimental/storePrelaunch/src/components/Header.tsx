import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HeaderProps {
  onOpenVIPModal?: () => void;
  isVIP: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenVIPModal, isVIP }) => {
  const [scrolled, setScrolled] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    sounds.enabled = !soundActive;
    setSoundActive(!soundActive);
    if (!soundActive) {
      sounds.playChime();
    }
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.4s ease',
        background: scrolled ? 'rgba(10, 3, 5, 0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(212, 175, 55, 0.15)' : '1px solid transparent',
        padding: scrolled ? '14px 24px' : '24px 32px',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <a
          href="#"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            outline: 'none',
          }}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <img
            src="/assets/vayyari-logo.png"
            alt="Vayyari"
            style={{
              height: scrolled ? '34px' : '40px',
              width: 'auto',
              objectFit: 'contain',
              transition: 'all 0.3s ease',
              filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))',
            }}
          />
        </a>

        {/* Center Navigation Links (Hidden on small mobile) */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          <a
            href="#capsule"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-champagne)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Capsule Preview
          </a>
          <a
            href="#waitlist"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-champagne)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            VIP Waitlist
          </a>
          <a
            href="#philosophy"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-champagne)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Brand Story
          </a>
          <a
            href="#community"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-champagne)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Boutique Channels
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundActive ? 'Mute sound effects' : 'Enable sound effects'}
            title={soundActive ? 'Mute ambient sound' : 'Enable ambient sound'}
            style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              color: soundActive ? 'var(--gold-champagne)' : 'var(--text-subtle)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--gold)';
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)';
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
            }}
          >
            {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* VIP Pass Button */}
          {isVIP ? (
            <button
              onClick={() => {
                sounds.playChime();
                if (onOpenVIPModal) onOpenVIPModal();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(103,20,36,0.3) 100%)',
                border: '1px solid var(--gold)',
                color: 'var(--gold-bright)',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(212,175,55,0.25)',
                transition: 'all 0.3s ease',
              }}
            >
              <Sparkles size={14} className="animate-pulse" />
              View VIP Pass
            </button>
          ) : (
            <a
              href="#waitlist"
              onClick={() => sounds.playTick()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #dfbe64 0%, #c99c38 100%)',
                color: '#0d0406',
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 14px rgba(212,175,55,0.25)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,175,55,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 14px rgba(212,175,55,0.25)';
              }}
            >
              Join Waitlist
            </a>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};
