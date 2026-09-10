import { Platform } from 'react-native';

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
  if (typeof window !== 'undefined' && window.localStorage) {
    let id = window.localStorage.getItem('vy_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      window.localStorage.setItem('vy_device_id', id);
    }
    return id;
  }
  return 'dev_anon_' + Date.now();
}

class UserJourneyTelemetryManager {
  private sessionStartTime: number;
  private breadcrumbs: JourneyEvent[] = [];
  private isEnabled: boolean = true;
  private optOut: boolean = false;
  private deviceId: string;
  private posthogHost: string = 'http://localhost:8000';

  constructor() {
    this.sessionStartTime = Date.now();
    this.deviceId = getOrSetDeviceId();

    this.trackEvent('session_start', {
      platform: Platform.OS,
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'native',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      deviceId: this.deviceId,
    });

    if (typeof window !== 'undefined') {
      (window as any).__VAYYARI_JOURNEY__ = {
        getDeviceId: () => this.deviceId,
        getHistory: () => this.getJourneyHistory(),
        summary: () => this.getSummary(),
        clear: () => this.clearHistory(),
      };
    }
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

    // Bridge to PostHog Web SDK or HTTP Ingestion
    if (typeof window !== 'undefined') {
      if ((window as any).posthog?.capture) {
        try {
          (window as any).posthog.capture(type, {
            ...properties,
            distinct_id: this.deviceId,
          });
        } catch {}
      } else {
        // Direct lightweight beacon to self-hosted PostHog ingestion endpoint
        try {
          fetch(`${this.posthogHost}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: 'deeplens_store_beta_key',
              event: type,
              properties: {
                distinct_id: this.deviceId,
                $lib: 'deeplens-pwa-telemetry',
                ...properties,
              },
              timestamp: new Date().toISOString(),
            }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
      }
    }
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getJourneyHistory(): JourneyEvent[] {
    return [...this.breadcrumbs];
  }

  public getSummary() {
    return {
      deviceId: this.deviceId,
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
