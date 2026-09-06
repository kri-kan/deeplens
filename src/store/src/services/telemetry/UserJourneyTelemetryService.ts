import { Platform } from 'react-native';

export type JourneyEventType =
  | 'session_start'
  | 'page_view'
  | 'category_clicked'
  | 'product_viewed'
  | 'swatch_selected'
  | 'add_to_wishlist'
  | 'add_to_bag'
  | 'cart_viewed'
  | 'checkout_initiated'
  | 'checkout_auth_gated'
  | 'auth_sheet_opened'
  | 'auth_completed'
  | 'order_placed'
  | 'location_action'
  | 'pwa_prompt_action';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  timestamp: string;
  epochMs: number;
  properties?: Record<string, any>;
  sessionDurationSec: number;
}

class UserJourneyTelemetryManager {
  private sessionStartTime: number;
  private breadcrumbs: JourneyEvent[] = [];
  private isEnabled: boolean = true;
  private optOut: boolean = false;

  constructor() {
    this.sessionStartTime = Date.now();
    this.trackEvent('session_start', {
      platform: Platform.OS,
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'native',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });

    if (typeof window !== 'undefined') {
      (window as any).__VAYYARI_JOURNEY__ = {
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
      properties,
      sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
    };

    this.breadcrumbs.push(event);
    if (this.breadcrumbs.length > 200) {
      this.breadcrumbs.shift();
    }

    // Development Console Logging with High-Readability Emoji Icons
    const emojiMap: Record<JourneyEventType, string> = {
      session_start: '🚀',
      page_view: '📄',
      category_clicked: '🏷️',
      product_viewed: '👁️',
      swatch_selected: '🎨',
      add_to_wishlist: '♥',
      add_to_bag: '🛍️',
      cart_viewed: '🛒',
      checkout_initiated: '💳',
      checkout_auth_gated: '⛔',
      auth_sheet_opened: '🔐',
      auth_completed: '✅',
      order_placed: '🎉',
      location_action: '📍',
      pwa_prompt_action: '📲',
    };

    const icon = emojiMap[type] || '📊';
    console.log(`%c[Journey ${icon}] ${type}`, 'color: #D4AF37; font-weight: bold;', {
      seconds: event.sessionDurationSec,
      ...properties,
    });

    // Bridge to Countly Web SDK if active (ADO User Story #96)
    if (typeof window !== 'undefined' && (window as any).Countly) {
      try {
        (window as any).Countly.q.push([
          'add_event',
          {
            key: type,
            count: 1,
            segmentation: properties,
          },
        ]);
      } catch (err) {
        console.warn('Countly event dispatch warning:', err);
      }
    }
  }

  public getJourneyHistory(): JourneyEvent[] {
    return [...this.breadcrumbs];
  }

  public getSummary() {
    const counts: Record<string, number> = {};
    for (const b of this.breadcrumbs) {
      counts[b.type] = (counts[b.type] || 0) + 1;
    }
    return {
      totalEvents: this.breadcrumbs.length,
      sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
      funnel: counts,
    };
  }

  public clearHistory() {
    this.breadcrumbs = [];
  }

  public setOptOut(optOut: boolean) {
    this.optOut = optOut;
  }
}

export const telemetry = new UserJourneyTelemetryManager();
