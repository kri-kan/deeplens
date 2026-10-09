import React from 'react';
import { BrandLogo } from './BrandLogo';
import { InstagramIcon, WhatsAppIcon, FacebookIcon, YouTubeIcon } from './Icons';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        padding: '64px 32px',
        textAlign: 'center',
        background: 'var(--bg-dark)',
        borderTop: '1px solid rgba(212, 175, 55, 0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1152px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Brand Logo */}
        <BrandLogo size="md" align="center" />

        {/* Tagline as in original */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            letterSpacing: '0.38em',
            textTransform: 'uppercase',
            color: 'rgba(212, 175, 55, 0.7)',
          }}
        >
          Elegance. Heritage. You.
        </p>

        {/* Social Icons */}
        <nav aria-label="Social media links">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a
              href="https://www.instagram.com/vayyari_fashions/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{
                color: 'rgba(212, 175, 55, 0.5)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212, 175, 55, 0.5)')}
            >
              <InstagramIcon size={16} />
            </a>

            <a
              href="https://www.facebook.com/vayyarifashions"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              style={{
                color: 'rgba(212, 175, 55, 0.5)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212, 175, 55, 0.5)')}
            >
              <FacebookIcon size={16} />
            </a>

            <a
              href="https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Community"
              style={{
                color: 'rgba(212, 175, 55, 0.5)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212, 175, 55, 0.5)')}
            >
              <WhatsAppIcon size={16} />
            </a>

            <a
              href="https://www.youtube.com/@vayyari_fashions"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              style={{
                color: 'rgba(212, 175, 55, 0.5)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212, 175, 55, 0.5)')}
            >
              <YouTubeIcon size={16} />
            </a>
          </div>
        </nav>

        {/* Divider as in original */}
        <div
          style={{
            width: '64px',
            height: '1px',
            background: 'rgba(212, 175, 55, 0.2)',
          }}
        />

        {/* Copyright as in original */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.06em',
          }}
        >
          © 2026 Vayyari. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
