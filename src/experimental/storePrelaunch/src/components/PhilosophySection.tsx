import React, { useRef } from 'react';

export const PhilosophySection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section
      id="philosophy"
      aria-label="Brand Philosophy"
      style={{
        position: 'relative',
        height: 'clamp(380px, 65vh, 700px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background Video with light overlay so the video stands out clearly */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <video
          ref={videoRef}
          src="/assets/philosophy.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 1,
            filter: 'contrast(1.22) saturate(1.28) brightness(1.08)',
          }}
        />
        {/* Spotlit radial aperture: clear center allows loom & silk details to punch through vividly */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at center, rgba(0, 0, 0, 0) 0%, rgba(13, 4, 6, 0.2) 50%, rgba(10, 3, 5, 0.6) 100%)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Narrative matching original content exactly */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 32px',
          maxWidth: '768px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '1px',
            height: '48px',
            margin: '0 auto 32px',
            background: 'linear-gradient(to bottom, transparent, var(--gold))',
          }}
          aria-hidden="true"
        />

        <blockquote
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
            fontWeight: 300,
            fontStyle: 'italic',
            lineHeight: 1.4,
            color: 'var(--text-ivory)',
            letterSpacing: '0.01em',
            marginBottom: '24px',
            textShadow: '0 2px 20px rgba(0,0,0,0.85)',
          }}
        >
          <span>" Every thread tells a story. Every drape, a legacy. "</span>
        </blockquote>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            letterSpacing: '0.32em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          — VAYYARI
        </p>
      </div>
    </section>
  );
};
