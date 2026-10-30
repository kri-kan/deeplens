// Multi-Layer Device Fingerprint & Unified Signal Ingestion (Epic 2)
// For Vayyari Prelaunch & Store Web SPA
import posthog from 'posthog-js';

export interface DeviceMetadata {
  deviceId: string;
  fingerprintHash: string;
  platform: 'web' | 'pwa' | 'android' | 'ios';
  os: string;
  model: string;
  browser: string;
  screenResolution: string;
  metadata?: Record<string, any>;
}

// 32-bit FNV-1a hash algorithm
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeDeviceFingerprint(): { hash: string; specs: Omit<DeviceMetadata, 'deviceId' | 'fingerprintHash'> } {
  const isWeb = typeof window !== 'undefined';
  const isPWA = isWeb && (window.matchMedia?.('(display-mode: standalone)')?.matches || (window.navigator as any)?.standalone === true);

  let userAgent = 'unknown';
  let screenRes = 'unknown';
  let language = 'en';
  let timezone = 'UTC';
  let os = 'web';
  let browser = 'Browser';
  let model = 'Desktop';
  let cores = 4;
  let touchPoints = 0;

  if (isWeb) {
    userAgent = window.navigator?.userAgent || 'unknown';
    language = window.navigator?.language || 'en';
    cores = window.navigator?.hardwareConcurrency || 4;
    touchPoints = window.navigator?.maxTouchPoints || 0;
    screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}@${window.devicePixelRatio || 1}`;

    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    // Parse OS & Model
    if (/Android/i.test(userAgent)) {
      os = 'Android';
      const match = userAgent.match(/Android\s+([\d.]+)/);
      if (match) os += ` ${match[1]}`;

      // Model extraction (e.g., Nothing Phone, Pixel, Samsung, OnePlus)
      const modelMatch = userAgent.match(/;\s*([^;)]+)\s+Build/);
      if (modelMatch) {
        model = modelMatch[1].trim();
        if (/A063|A065|AIN065|Nothing/i.test(model)) {
          model = 'Nothing Phone';
        }
      } else {
        model = 'Android Device';
      }
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      os = 'iOS';
      model = /iPad/i.test(userAgent) ? 'iPad' : 'iPhone';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
      os = 'macOS';
      model = 'Mac';
    } else if (/Windows/i.test(userAgent)) {
      os = 'Windows';
      model = 'PC';
    } else if (/Linux/i.test(userAgent)) {
      os = 'Linux';
      model = 'PC';
    }

    // Parse Browser
    if (/Chrome/i.test(userAgent) && !/Edge|OPR|Brave/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Edge|Edg/i.test(userAgent)) {
      browser = 'Edge';
    }
  }

  const entropyString = [userAgent, screenRes, language, timezone, cores, touchPoints, os, browser].join('|');
  const hash = 'fp_' + fnv1a(entropyString);

  const effectivePlatform: 'web' | 'pwa' | 'android' | 'ios' = isPWA
    ? 'pwa'
    : /Android/i.test(os)
    ? 'android'
    : /iOS/i.test(os)
    ? 'ios'
    : 'web';

  return {
    hash,
    specs: {
      platform: effectivePlatform,
      os,
      model,
      browser,
      screenResolution: screenRes,
      metadata: {
        language,
        timezone,
        cores,
        touchPoints,
        isPWA,
      },
    },
  };
}

export function getOrCreatePersistentDeviceId(): DeviceMetadata {
  const { hash, specs } = computeDeviceFingerprint();

  let storedId: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      storedId = window.localStorage.getItem('vy_device_id');
      if (!storedId) {
        storedId = `dev_${hash.replace('fp_', '')}_${Date.now().toString(36)}`;
        window.localStorage.setItem('vy_device_id', storedId);
        window.localStorage.setItem('vy_device_fp', hash);
      }
    } catch {
      storedId = `dev_${hash.replace('fp_', '')}_ephemeral`;
    }
  } else {
    storedId = `dev_${hash.replace('fp_', '')}_ephemeral`;
  }

  return {
    deviceId: storedId,
    fingerprintHash: hash,
    ...specs,
  };
}

class PrelaunchTelemetryManager {
  private sessionStartTime: number;
  private deviceMetadata: DeviceMetadata;
  private sessionId: string;
  private signalBuffer: any[] = [];
  private flushTimer: any = null;
  private posthogInitialized: boolean = false;

  constructor() {
    this.sessionStartTime = Date.now();
    this.deviceMetadata = getOrCreatePersistentDeviceId();
    this.sessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Initialize PostHog targeting the first-party /ingest proxy
    this.initPostHog();

    // Track initial session start
    this.trackSignal('session_start', {
      landingPage: typeof window !== 'undefined' ? window.location.pathname : '/',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });

    if (typeof window !== 'undefined') {
      (window as any).__VAYYARI_TELEMETRY__ = {
        getDeviceId: () => this.deviceMetadata.deviceId,
        getDeviceMetadata: () => this.deviceMetadata,
        flush: () => this.flushSignals(),
        track: (type: string, props: any) => this.trackSignal(type, props),
        posthog: () => posthog,
      };

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushSignals();
        }
      });
      window.addEventListener('beforeunload', () => {
        this.flushSignals();
      });
    }
  }

  private initPostHog() {
    if (typeof window === 'undefined') return;
    try {
      // Ingest endpoint routes through Vite same-origin proxy to self-hosted PostHog on port 8000
      const apiHost = `${window.location.origin}/ingest`;
      const apiKey =
        (window as any).__POSTHOG_API_KEY__ ||
        (import.meta as any).env?.VITE_POSTHOG_API_KEY ||
        'phc_vayyari_prelaunch';

      posthog.init(apiKey, {
        api_host: apiHost,
        ui_host: 'http://localhost:8000',
        bootstrap: {
          distinctID: this.deviceMetadata.deviceId,
        },
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
        },
        loaded: (ph) => {
          ph.register({
            platform: this.deviceMetadata.platform,
            os: this.deviceMetadata.os,
            model: this.deviceMetadata.model,
            browser: this.deviceMetadata.browser,
            screenResolution: this.deviceMetadata.screenResolution,
            fingerprintHash: this.deviceMetadata.fingerprintHash,
            app: 'vayyari-prelaunch',
          });
        },
      });
      this.posthogInitialized = true;
    } catch (err) {
      console.debug('[PostHog] Init deferred:', err);
    }
  }

  public trackSignal(type: string, properties: Record<string, any> = {}) {
    const payload = {
      signalId: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      signalType: type,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
      },
    };

    this.signalBuffer.push(payload);

    // Dual-dispatch to PostHog
    try {
      if (typeof window !== 'undefined' && posthog.__loaded) {
        posthog.capture(type, {
          ...properties,
          distinct_id: this.deviceMetadata.deviceId,
          session_duration_sec: Math.round((Date.now() - this.sessionStartTime) / 1000),
        });
      }
    } catch {}

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    // Flush after 400ms or immediately for key events
    if (type === 'session_start' || type === 'waitlist_join_clicked') {
      this.flushSignals();
    } else {
      this.flushTimer = setTimeout(() => this.flushSignals(), 400);
    }
  }

  public trackScrollMilestone(percentage: number) {
    this.trackSignal('scroll_milestone', { percentage });
  }

  public trackVideoAction(action: 'play' | 'pause') {
    this.trackSignal('hero_video_action', { action });
  }

  public trackSocialClick(network: string, url: string) {
    this.trackSignal('social_link_clicked', { network, url });
  }

  public trackSilhouetteViewed(silhouette: { id: string; title: string; category?: string }) {
    this.trackSignal('silhouette_viewed', silhouette);
  }

  public flushSignals() {
    if (this.signalBuffer.length === 0) return;

    const signalsToSend = [...this.signalBuffer];
    this.signalBuffer = [];

    const requestBody = {
      device: {
        deviceId: this.deviceMetadata.deviceId,
        fingerprintHash: this.deviceMetadata.fingerprintHash,
        platform: this.deviceMetadata.platform,
        os: this.deviceMetadata.os,
        model: this.deviceMetadata.model,
        browser: this.deviceMetadata.browser,
        screenResolution: this.deviceMetadata.screenResolution,
        metadata: this.deviceMetadata.metadata,
      },
      sessionId: this.sessionId,
      signals: signalsToSend,
    };

    // Use relative endpoint /api/v1/telemetry/signals so it works on any host/domain smoothly
    const endpoint = '/api/v1/telemetry/signals';

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(requestBody)], { type: 'application/json' });
        const success = navigator.sendBeacon(endpoint, blob);
        if (success) return;
      }
    } catch {}

    // Fallback to fetch
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      keepalive: true,
    }).catch((err) => {
      console.warn('[Telemetry] Flush error:', err);
    });
  }
}

export const telemetry = new PrelaunchTelemetryManager();
