import React, { useState } from 'react';
import { Sparkles, Eye, X, CheckCircle, ArrowRight } from 'lucide-react';
import { CapsuleItem } from '../types';
import { sounds } from '../utils/audio';

const CAPSULE_COLLECTION: CapsuleItem[] = [
  {
    id: 'kanchipuram',
    title: 'Swarna Kanchipuram',
    subtitle: 'Pure Mulberry Silk & 24K Gold Zari',
    category: 'Heritage Silk',
    fabric: 'Pure Mulberry Silk 3-Ply',
    origin: 'Kanchipuram, Tamil Nadu',
    tag: 'Signature Heirloom',
    description:
      'Woven by seventh-generation master artisans using age-old Korvai interlock techniques. Adorned with sacred temple Gopuram borders and pure silver-dipped gold zari.',
  },
  {
    id: 'banarasi',
    title: 'Varanasi Imperial Brocade',
    subtitle: 'Antique Kadwa Weave & Rose-Gold Sheen',
    category: 'Royal Brocade',
    fabric: 'Katan Silk & Tissue',
    origin: 'Varanasi, Uttar Pradesh',
    tag: 'Limited Edition',
    description:
      'Intricate floral jaals meticulously crafted on hand-looms over 120 artisan days. Designed to shimmer with understated majesty under warm evening candlelights.',
  },
  {
    id: 'organza',
    title: 'Chanderi & Organza Whisper',
    subtitle: 'Featherlight Sheer Silk with Zardozi',
    category: 'Festive Pret',
    fabric: 'Silk Organza & Handspun Chanderi',
    origin: 'Chanderi, Madhya Pradesh',
    tag: 'Contemporary Classic',
    description:
      'A delicate confluence of weightless air and opulent embroidery. Accented with micro-pearl scallops and fine hand-stitched French knots.',
  },
  {
    id: 'velvet',
    title: 'Noor Velvet Ensembles',
    subtitle: 'Deep Jewel Velvet with Parsi Gara Work',
    category: 'Haute Bridal',
    fabric: 'Silk Velvet & Dupion Silk',
    origin: 'Atelier Vayyari',
    tag: 'Boutique Exclusive',
    description:
      'Sculpted royal silhouettes created for evening gala celebrations. Deep claret wine velvet hand-embellished with antique dabka and genuine semi-precious stones.',
  },
];

export const CapsuleSneakPeek: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<CapsuleItem | null>(null);

  const openItem = (item: CapsuleItem) => {
    sounds.playChime();
    setSelectedItem(item);
  };

  const closeItem = () => {
    sounds.playTick();
    setSelectedItem(null);
  };

  return (
    <section
      id="capsule"
      style={{
        position: 'relative',
        padding: '110px 0',
        background: 'linear-gradient(180deg, #0a0305 0%, #120509 50%, #0a0305 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background Subtle Kolam Accent Watermark */}
      <div
        style={{
          position: 'absolute',
          right: '-5%',
          top: '15%',
          width: '550px',
          height: '550px',
          opacity: 0.04,
          pointerEvents: 'none',
          backgroundImage: 'url(/assets/kolam-bg.svg)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="container-luxury">
        {/* Section Heading */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--gold-champagne)',
              fontSize: '0.74rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            <Sparkles size={14} />
            The Inaugural Capsule
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.3rem, 5vw, 3.8rem)',
              fontWeight: 500,
              color: 'var(--text-ivory)',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            Artistry Woven in Every <span className="text-gold-gradient">Thread</span>
          </h2>

          <div
            style={{
              width: '60px',
              height: '1px',
              background: 'var(--gold)',
              margin: '0 auto 20px',
            }}
          />

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-muted)',
              fontSize: '1.05rem',
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            A confidential first glance at our curated debut silhouettes, honoring millennia of Indian
            weaving heritage with modern imperial poise.
          </p>
        </div>

        {/* 4-Item Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {CAPSULE_COLLECTION.map((item, idx) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                cursor: 'pointer',
              }}
              onClick={() => openItem(item)}
            >
              <div>
                {/* Header Tag */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      color: 'rgba(212, 175, 55, 0.45)',
                    }}
                  >
                    0{idx + 1}
                  </span>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.18em',
                      color: 'var(--gold-champagne)',
                      background: 'rgba(212, 175, 55, 0.12)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.65rem',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    marginBottom: '8px',
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    color: 'var(--gold-champagne)',
                    fontSize: '0.82rem',
                    letterSpacing: '0.08em',
                    marginBottom: '16px',
                  }}
                >
                  {item.subtitle}
                </p>

                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                    lineHeight: 1.65,
                    marginBottom: '24px',
                  }}
                >
                  {item.description}
                </p>
              </div>

              {/* Action Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(212, 175, 55, 0.14)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.74rem',
                    letterSpacing: '0.16em',
                    color: 'var(--gold-champagne)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Eye size={13} />
                  Inspect Spec
                </span>
                <ArrowRight size={14} color="var(--gold-champagne)" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Spec Inspection */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(5, 2, 3, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={closeItem}
        >
          <div
            style={{
              background: '#15060b',
              border: '1px solid var(--gold)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              padding: '36px 32px',
              position: 'relative',
              boxShadow: '0 24px 70px rgba(0,0,0,0.8), 0 0 35px rgba(212,175,55,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeItem}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: 'var(--gold-champagne)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <span
              style={{
                color: 'var(--gold-champagne)',
                fontSize: '0.72rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
              }}
            >
              {selectedItem.category} • {selectedItem.tag}
            </span>

            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.2rem',
                color: 'var(--text-main)',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              {selectedItem.title}
            </h3>

            <p style={{ color: 'var(--gold-champagne)', fontSize: '0.92rem', marginBottom: '24px' }}>
              {selectedItem.subtitle}
            </p>

            <div
              style={{
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.18)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Fabric & Weave
                  </span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                    {selectedItem.fabric}
                  </strong>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Atelier Origin
                  </span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                    {selectedItem.origin}
                  </strong>
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.7, marginBottom: '28px' }}>
              {selectedItem.description}
            </p>

            <a
              href="#waitlist"
              className="btn-gold"
              style={{ width: '100%' }}
              onClick={() => {
                closeItem();
                sounds.playTick();
              }}
            >
              <CheckCircle size={15} />
              <span>Reserve Priority Preview For This Line</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
};
