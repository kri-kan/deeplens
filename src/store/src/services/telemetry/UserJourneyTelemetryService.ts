import { Platform } from 'react-native';
import { getOrCreatePersistentDeviceId, DeviceMetadata } from './DeviceFingerprint';

declare const process: any;

export type JourneyEventType =
  | 'session_start'
  | 'page_view'
  | 'search_performed'
  | 'category_clicked'
  | 'product_viewed'
  | 'product_image_swiped'
  | 'swatch_selected'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'add_to_bag'
  | 'cart_viewed'
  | 'cart_quantity_updated'
  | 'cart_shared_whatsapp'
  | 'shared_cart_viewed'
  | 'checkout_initiated'
  | 'checkout_auth_gated'
  | 'auth_sheet_opened'
  | 'auth_completed'
  | 'share_clicked'
  | 'deep_link_opened'
  | 'order_placed';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  timestamp: string;
  epochMs: number;
  distinctId: string;
  properties?: Record<string, any>;
  sessionDurationSec: number;
}

export function getOrSetDeviceId(): string {
  const metadata = getOrCreatePersistentDeviceId();
  return metadata.deviceId;
}

class UserJourneyTelemetryManager {
  private sessionStartTime: number;
  private breadcrumbs: JourneyEvent[] = [];
  private isEnabled: boolean = true;
  private optOut: boolean = false;
  private deviceMetadata: DeviceMetadata;
  private deviceId: string;
  private sessionId: string;
  private signalBuffer: any[] = [];
  private flushTimer: any = null;
  private posthogHost: string = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_POSTHOG_HOST) || '';

  constructor() {
    this.sessionStartTime = Date.now();
    this.deviceMetadata = getOrCreatePersistentDeviceId();
    this.deviceId = this.deviceMetadata.deviceId;
    this.sessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Track session start
    this.trackEvent('session_start', {
      platform: this.deviceMetadata.platform,
      os: this.deviceMetadata.os,
      model: this.deviceMetadata.model,
      browser: this.deviceMetadata.browser,
      screenResolution: this.deviceMetadata.screenResolution,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      deviceId: this.deviceId,
      fingerprintHash: this.deviceMetadata.fingerprintHash,
    });

    if (typeof window !== 'undefined') {
      (window as any).__VAYYARI_JOURNEY__ = {
        getDeviceId: () => this.deviceId,
        getDeviceMetadata: () => this.deviceMetadata,
        getHistory: () => this.getJourneyHistory(),
        summary: () => this.getSummary(),
        flush: () => this.flushSignals(),
        clear: () => this.clearHistory(),
      };

      // Flush signals on tab switch / page close
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

  private getStoreApiUrl(): string {
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_STORE_API_URL) {
      return process.env.EXPO_PUBLIC_STORE_API_URL;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      if (window.location.hostname.endsWith('vayyarifashions.com')) {
        return `${window.location.protocol}//storeapi.vayyarifashions.com`;
      }
      return `http://${window.location.hostname}:5200`;
    }
    return 'http://192.168.0.170:5200';
  }

  public trackEvent(type: JourneyEventType, properties: Record<string, any> = {}) {
    if (!this.isEnabled || this.optOut) return;

    const event: JourneyEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      epochMs: Date.now(),
      distinctId: this.deviceId,
      properties: {
        ...properties,
        deviceId: this.deviceId,
      },
      sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
    };

    this.breadcrumbs.push(event);
    if (this.breadcrumbs.length > 200) {
      this.breadcrumbs.shift();
    }

    // Console Logging with Emoji
    const emojiMap: Record<JourneyEventType, string> = {
      session_start: '🚀',
      page_view: '📄',
      search_performed: '🔍',
      category_clicked: '🏷️',
      product_viewed: '👁️',
      product_image_swiped: '📸',
      swatch_selected: '🎨',
      add_to_wishlist: '♥',
      remove_from_wishlist: '💔',
      add_to_bag: '🛍️',
      cart_viewed: '🛒',
      cart_quantity_updated: '🔢',
      cart_shared_whatsapp: '📲',
      shared_cart_viewed: '👁️‍🗨️',
      checkout_initiated: '💳',
      checkout_auth_gated: '🔒',
      auth_sheet_opened: '🔑',
      auth_completed: '✅',
      share_clicked: '🔗',
      order_placed: '🎉',
      deep_link_opened: '🌐',
    };

    const icon = emojiMap[type] || '📊';
    console.log(`%c[Telemetry ${icon}] ${type}`, 'color: #10B981; font-weight: bold;', {
      distinctId: this.deviceId,
      seconds: event.sessionDurationSec,
      ...properties,
    });

    // Buffer signal for unified Store.Api ingestion
    this.signalBuffer.push({
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      signalType: type,
      properties: {
        ...properties,
        sessionDurationSec: event.sessionDurationSec,
      },
      clientTimestamp: event.timestamp,
    });

    const isCritical = ['session_start', 'checkout_initiated', 'order_placed', 'cart_shared_whatsapp'].includes(type);
    if (isCritical || this.signalBuffer.length >= 10) {
      this.flushSignals();
    } else {
      this.scheduleFlush();
    }

    // Optional secondary bridge to PostHog Web SDK (if mounted)
    if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
      try {
        (window as any).posthog.capture(type, {
          ...properties,
          distinct_id: this.deviceId,
        });
      } catch {}
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushSignals();
    }, 3000);
  }

  public flushSignals() {
    if (this.signalBuffer.length === 0) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = [...this.signalBuffer];
    this.signalBuffer = [];

    const payload = {
      device: this.deviceMetadata,
      signals: batch,
    };

    const url = `${this.getStoreApiUrl()}/api/v1/telemetry/signals`;

    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
        // Non-blocking catch to prevent UI interruption
        console.debug('[Telemetry] Flush failed, will retry next cycle:', err);
      });
    } catch {}
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getDeviceMetadata(): DeviceMetadata {
    return this.deviceMetadata;
  }

  public getJourneyHistory(): JourneyEvent[] {
    return [...this.breadcrumbs];
  }

  public getSummary() {
    return {
      deviceId: this.deviceId,
      platform: this.deviceMetadata.platform,
      totalEvents: this.breadcrumbs.length,
      sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
      eventCounts: this.breadcrumbs.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  public clearHistory() {
    this.breadcrumbs = [];
  }
}

export const telemetry = new UserJourneyTelemetryManager();
