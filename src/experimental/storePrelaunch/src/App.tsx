import React, { useState, useEffect, useRef } from 'react';
import { HeroSection } from './components/HeroSection';
import { WaitlistSection } from './components/WaitlistSection';
import { SocialSection } from './components/SocialSection';
import { PhilosophySection } from './components/PhilosophySection';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { ToastMessage } from './types';
import { sounds } from './utils/audio';

export const App: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Clear legacy pass storage so waitlist is always fresh
    try {
      localStorage.removeItem('vayyari_vip_member_data');
    } catch {
      // ignore
    }
  }, []);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    sounds.playTick();
  };

  const showToast = (message: string, type: 'gold' | 'success' | 'info' = 'gold') => {
    setToast({ id: String(Date.now()), message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Main Single Page Application Content */}
      <main>
        {/* Dark Region Container: Background video stays pinned across both Hero and Waitlist */}
        <div
          className="dark-video-region"
          style={{
            position: 'relative',
            width: '100%',
          }}
        >
          {/* Sticky Background Video: stays fixed in viewport until this dark container ends */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              overflow: 'hidden',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <video
              ref={videoRef}
              src="/assets/hero.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                filter: 'contrast(1.24) saturate(1.3) brightness(1.1)',
              }}
            />

            {/* Clear optical aperture over the focal point (model and gown), framing into deep royal dark tones */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at 68% 38%, rgba(0, 0, 0, 0) 0%, rgba(20, 5, 10, 0.15) 45%, rgba(10, 3, 5, 0.55) 85%, rgba(10, 3, 5, 0.75) 100%)',
              }}
            />

            {/* Left directional text contrast scrim to keep typography crisp without darkening the whole video */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(10, 3, 5, 0.55) 0%, rgba(10, 3, 5, 0.2) 40%, transparent 70%)',
              }}
            />
          </div>

          {/* Content Layer that scrolls on top of the sticky video */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              marginTop: '-100vh',
            }}
          >
            {/* 1. Hero Content */}
            <HeroSection
              isPlaying={isPlaying}
              onToggleVideo={toggleVideo}
            />

            {/* 2. VIP Waitlist Section (Direct WhatsApp Early Access) */}
            <WaitlistSection />
          </div>
        </div>

        {/* 3. Cutoff: Light region begins here - as user scrolls into this, the dark container & video scroll away */}
        <SocialSection />

        {/* 4. Brand Philosophy Section */}
        <PhilosophySection />
      </main>

      {/* 5. Footer */}
      <Footer />

      {/* Notification Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default App;
