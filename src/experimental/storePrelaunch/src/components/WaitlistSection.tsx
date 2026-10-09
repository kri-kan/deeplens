import React from 'react';
import { WhatsAppIcon } from './Icons';
import { sounds } from '../utils/audio';

export const WaitlistSection: React.FC = () => {
  const whatsappUrl = `https://wa.me/919494511272?text=${encodeURIComponent(
    'Hello Vayyari, I would like to join the early access list.'
  )}`;

  return (
    <section
      id="waitlist"
      aria-label="VIP Waitlist"
      style={{
        position: 'relative',
        padding: '120px 32px 140px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(10, 3, 5, 0.2) 30%, rgba(10, 3, 5, 0.6) 100%)',
      }}
    >
      {/* Subtle radial glow in the corner as in original */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '384px',
          height: '384px',
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(103, 20, 36, 0.22) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }}
        aria-hidden="true"
      />

      <div
        style={{
          maxWidth: '1152px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '64px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left Column: Narrative */}
        <div>
          <div
            style={{
              width: '48px',
              height: '1px',
              background: 'var(--gold)',
              marginBottom: '32px',
            }}
            aria-hidden="true"
          />

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              lineHeight: 1.15,
              fontWeight: 400,
              color: 'var(--text-ivory)',
              marginBottom: '24px',
              textShadow: '0 4px 24px rgba(0, 0, 0, 0.85)',
            }}
          >
            Be the First to Enter
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              fontWeight: 300,
              lineHeight: 1.75,
              color: 'rgba(250, 238, 226, 0.72)',
              maxWidth: '448px',
              textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)',
            }}
          >
            Join our exclusive VIP waitlist and receive early access, private previews, and a special
            launch offer crafted just for you.
          </p>

          <div
            style={{
              marginTop: '48px',
              fontFamily: 'var(--font-heading)',
              fontSize: '3rem',
              color: 'rgba(212, 175, 55, 0.15)',
              userSelect: 'none',
            }}
            aria-hidden="true"
          >
            "
          </div>
        </div>

        {/* Right Column: Direct VIP Early Access Action */}
        <div>
          <div
            style={{
              border: '1px solid rgba(212, 175, 55, 0.28)',
              background: 'rgba(24, 9, 14, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '44px 36px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                letterSpacing: '0.25em',
                marginBottom: '16px',
                color: 'var(--gold)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              VIP EARLY ACCESS
            </p>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.95rem',
                fontWeight: 300,
                lineHeight: 1.65,
                color: 'rgba(250, 238, 226, 0.85)',
                marginBottom: '32px',
              }}
            >
              Message our boutique team directly on WhatsApp to reserve your priority access to the debut collection.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playChime()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '18px 24px',
                fontSize: '0.875rem',
                fontWeight: 600,
                letterSpacing: '0.22em',
                background: 'var(--gold)',
                color: 'var(--bg-dark)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)',
                transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.92';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(212, 175, 55, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.25)';
              }}
            >
              <WhatsAppIcon size={18} color="var(--bg-dark)" />
              <span>Join the Waitlist</span>
            </a>

            <p
              style={{
                marginTop: '20px',
                fontSize: '0.75rem',
                fontStyle: 'italic',
                color: 'rgba(191, 170, 160, 0.55)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              No spam. Only elegance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
