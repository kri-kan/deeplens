import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface PWAContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<boolean>;
  showIosGuide: boolean;
  setShowIosGuide: (show: boolean) => void;
  isIosSafari: boolean;
  showInstallBanner: boolean;
  setShowInstallBanner: (show: boolean) => void;
}

const PWAContext = createContext<PWAContextValue>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  promptInstall: async () => false,
  showIosGuide: false,
  setShowIosGuide: () => {},
  isIosSafari: false,
  showInstallBanner: true,
  setShowInstallBanner: () => {},
});

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Track online/offline status
    setIsOffline(!window.navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for offline PWA functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Vayyari PWA Service Worker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('Vayyari PWA SW registration warning:', err);
        });
    }

    // Ensure manifest link exists
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    // Check if running in standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      setShowInstallBanner(false);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
    if (isIos && isSafari) {
      setIsIosSafari(true);
      setIsInstallable(true);
    }

    // Listen for beforeinstallprompt event on Chromium/Chrome/Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (isIosSafari) {
      setShowIosGuide(true);
      return false;
    }

    if (!deferredPrompt) {
      // In browsers without active prompt, alert instructions or show guide
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        alert(
          'To install Vayyari on your desktop:\n\n1. Look for the install icon (⬇ / ⊕) in your browser address bar.\n2. Or click the browser menu (⋮) -> "Install Vayyari Store..."'
        );
      }
      return false;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setShowInstallBanner(false);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      return false;
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isOffline,
        promptInstall,
        showIosGuide,
        setShowIosGuide,
        isIosSafari,
        showInstallBanner,
        setShowInstallBanner,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
