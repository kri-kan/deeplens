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

    // Rehydrate any failed signals from previous offline sessions
    this.rehydrateFailedSignals();

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

      // Lifecycle flushes: visibility hidden, pagehide (iOS Safari), beforeunload
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushSignals();
        }
      });
      window.addEventListener('pagehide', () => {
        this.flushSignals();
      });
      window.addEventListener('beforeunload', () => {
        this.flushSignals();
      });

      // Auto-flush when device reconnects to WiFi/Cellular
      window.addEventListener('online', () => {
        this.flushSignals();
      });
    }
  }

  private initPostHog() {
    if (typeof window === 'undefined') return;
    try {
      const apiHost = `${window.location.origin}/ingest`;
      const apiKey =
        (window as any).__POSTHOG_API_KEY__ ||
        (import.meta as any).env?.VITE_POSTHOG_API_KEY ||
        'phc_vayyari_prelaunch';

      posthog.init(apiKey, {
        api_host: apiHost,
        bootstrap: {
          distinctID: this.deviceMetadata.deviceId,
        },
        // Client-side batching for high throughput & network efficiency
        request_batching: true,
        batch_size: 20,
        batch_flush_interval_ms: 3000,
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true, // Safeguard: prevents high-bandwidth DOM recording bursts
        session_recording: {
          maskAllInputs: true,
        },
        loaded: (ph: any) => {
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
      } as any);
      this.posthogInitialized = true;
    } catch (err) {
      console.debug('[PostHog] Init deferred:', err);
    }
  }

  public trackSignal(type: string, properties: Record<string, any> = {}) {
    const payload = {
      deviceId: this.deviceMetadata.deviceId,
      sessionId: this.sessionId,
      signalType: type,
      properties: {
        ...properties,
        sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
      },
      clientTimestamp: new Date().toISOString(),
    };

    this.signalBuffer.push(payload);
    // Safety cap buffer at 100 items to protect memory under offline conditions
    if (this.signalBuffer.length > 100) {
      this.signalBuffer.shift();
    }

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

    const isUrgent =
      type === 'session_start' ||
      type === 'waitlist_join_clicked' ||
      type === 'order_placed' ||
      this.signalBuffer.length >= 15;

    if (isUrgent) {
      this.flushSignals();
    } else if (!this.flushTimer) {
      // High-volume batch window: flush every 2500ms
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flushSignals();
      }, 2500);
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

  private rehydrateFailedSignals() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('vy_telemetry_retry_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.signalBuffer.unshift(...parsed);
          localStorage.removeItem('vy_telemetry_retry_queue');
        }
      }
    } catch {}
  }

  private persistFailedSignals(signals: any[]) {
    if (typeof window === 'undefined' || !signals || signals.length === 0) return;
    try {
      const existing = localStorage.getItem('vy_telemetry_retry_queue');
      let combined = signals;
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          combined = [...parsed, ...signals];
        }
      }
      if (combined.length > 50) {
        combined = combined.slice(combined.length - 50);
      }
      localStorage.setItem('vy_telemetry_retry_queue', JSON.stringify(combined));
    } catch {}
  }

  public flushSignals() {
    if (this.signalBuffer.length === 0) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

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

    // Fallback to fetch with keepalive & retry queue on error
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        console.warn('[Telemetry] Flush error, preserving signals for retry:', err);
        this.persistFailedSignals(signalsToSend);
      });
  }
}

export const telemetry = new PrelaunchTelemetryManager();
