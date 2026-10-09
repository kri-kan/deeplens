import React from 'react';
import { ArrowRight } from 'lucide-react';
import { InstagramIcon, WhatsAppIcon, FacebookIcon, YouTubeIcon } from './Icons';
import { sounds } from '../utils/audio';

const CHANNELS = [
  {
    id: 'instagram',
    tag: 'INSTAGRAM',
    title: 'Shop on Instagram',
    url: 'https://www.instagram.com/vayyari_fashions/',
    icon: InstagramIcon,
    accent: '#E1306C',
  },
  {
    id: 'facebook',
    tag: 'FACEBOOK',
    title: 'Find Us on Facebook',
    url: 'https://www.facebook.com/vayyarifashions',
    icon: FacebookIcon,
    accent: '#1877F2',
  },
  {
    id: 'whatsapp',
    tag: 'WHATSAPP',
    title: 'Join our WhatsApp',
    url: 'https://chat.whatsapp.com/JvL2RDTzCaYEWbBCkxBtAE',
    icon: WhatsAppIcon,
    accent: '#25D366',
  },
  {
    id: 'youtube',
    tag: 'YOUTUBE',
    title: 'Watch on YouTube',
    url: 'https://www.youtube.com/@vayyari_fashions',
    icon: YouTubeIcon,
    accent: '#FF0000',
  },
];

export const SocialSection: React.FC = () => {
  return (
    <section
      id="community"
      aria-label="Social Community"
      style={{
        padding: '60px 24px',
        background: '#fbf6f0', // Warm cream contrast background
        color: '#0d0406',
      }}
    >
      <div style={{ maxWidth: '1152px', margin: '0 auto' }}>
        {/* Clean Original Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              width: '40px',
              height: '2px',
              background: 'var(--primary)',
              marginBottom: '16px',
            }}
          />

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              fontWeight: 600,
              lineHeight: 1.15,
              marginBottom: '8px',
              color: '#0a0305',
              letterSpacing: '-0.01em',
            }}
          >
            Our Community Awaits You
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.96rem',
              fontWeight: 300,
              color: 'rgba(10, 3, 5, 0.65)',
              maxWidth: '480px',
              lineHeight: 1.5,
            }}
          >
            While we prepare our new home, continue shopping with us on our social channels.
          </p>
        </div>

        {/* Compact, Highly Clickable Tiles - Clean & Minimal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '12px',
          }}
        >
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;

            return (
              <a
                key={ch.id}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sounds.playTick()}
                style={{
                  background: '#0a0305',
                  border: '1px solid rgba(212, 175, 55, 0.22)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 18px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)';
                  e.currentTarget.style.background = '#15060b';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(0,0,0,0.25), 0 0 16px rgba(212, 175, 55, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.22)';
                  e.currentTarget.style.background = '#0a0305';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)';
                }}
              >
                {/* Left: Icon & Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gold-bright)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.64rem',
                        letterSpacing: '0.22em',
                        color: 'var(--gold-champagne)',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        marginBottom: '2px',
                      }}
                    >
                      {ch.tag}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--text-ivory)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                      }}
                    >
                      {ch.title}
                    </span>
                  </div>
                </div>

                {/* Right: Sleek Action Indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--gold)',
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)',
                    flexShrink: 0,
                  }}
                >
                  <span>VISIT</span>
                  <ArrowRight size={13} />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};
