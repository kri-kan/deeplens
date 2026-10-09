import React, { useEffect } from 'react';
import { X, Sparkles, Copy, Check, Share2, Award, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import { VIPMember } from '../types';
import { BrandLogo } from './BrandLogo';
import { sounds } from '../utils/audio';

interface VIPPassModalProps {
  member: VIPMember | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const VIPPassModal: React.FC<VIPPassModalProps> = ({
  member,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (member) {
      // Golden Confetti burst
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#f3d57d', '#671424', '#ffffff', '#dfbe64'],
      });
    }
  }, [member]);

  if (!member) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(member.vipCode);
    setCopied(true);
    sounds.playChime();
    onShowToast(`VIP Pass Code ${member.vipCode} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `I just received my exclusive VIP Early Access Pass for Vayyari Haute Couture! ✨\n\nPassport No: ${member.vipCode}\nDiscover handcrafted silks and royal bridal drapes before the public launch: ${window.location.origin}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    sounds.playTick();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(5, 2, 3, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close VIP Pass"
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-16px',
            zIndex: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--gold)',
            color: 'var(--gold-champagne)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
          }}
        >
          <X size={18} />
        </button>

        {/* Digital Gold Luxury Pass Card */}
        <div
          style={{
            background: 'linear-gradient(145deg, #18060c 0%, #0d0407 60%, #1a0810 100%)',
            border: '2px solid rgba(212, 175, 55, 0.65)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 32px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.22), inset 0 0 30px rgba(212, 175, 55, 0.08)',
          }}
        >
          {/* Subtle Watermark Kolam */}
          <div
            style={{
              position: 'absolute',
              right: '-15%',
              bottom: '-20%',
              width: '320px',
              height: '320px',
              opacity: 0.08,
              pointerEvents: 'none',
              backgroundImage: 'url(/assets/kolam-bg.svg)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Pass Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
              borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
              paddingBottom: '20px',
            }}
          >
            <BrandLogo size="sm" align="left" />
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--gold-bright)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.22em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <Award size={13} />
                Founding Member
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tier 1 • Privileged Access
              </span>
            </div>
          </div>

          {/* Member Credentials */}
          <div style={{ marginBottom: '28px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--gold-champagne)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              VIP Patron
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.1rem',
                fontWeight: 600,
                color: 'var(--text-ivory)',
                lineHeight: 1.15,
                marginBottom: '6px',
              }}
            >
              {member.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{member.email}</p>
          </div>

          {/* VIP Pass Serial Code Box */}
          <div
            style={{
              background: 'rgba(10, 3, 5, 0.75)',
              border: '1px solid var(--gold)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Private Access Code
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: 'var(--gold-bright)',
                  textShadow: '0 0 10px rgba(212,175,55,0.3)',
                }}
              >
                {member.vipCode}
              </span>
            </div>

            <button
              onClick={copyCode}
              style={{
                background: copied ? 'var(--gold)' : 'rgba(212, 175, 55, 0.15)',
                color: copied ? '#0d0406' : 'var(--gold-bright)',
                border: '1px solid var(--gold)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Privilege Privileges */}
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}
          >
            <p>
              ✨ Valid for private pre-launch entry 48 hours prior to public opening.
              <br />
              ✨ Redeemable for complimentary inaugural styling consultation.
            </p>
          </div>

          {/* Action Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={shareWhatsApp}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Share2 size={15} />
              <span>Share Invite</span>
            </button>

            <button
              onClick={() => {
                window.print();
                sounds.playTick();
              }}
              style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid var(--gold)',
                color: 'var(--gold-champagne)',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Print Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
