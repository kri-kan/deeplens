// Vayyari Store Customer Auth Service
// WhatsApp-First Identity & 365-Day Session Persistence (Epic 1)

import { getDeviceId } from '../telemetry/DeviceFingerprint';

export interface CustomerProfile {
  userId: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  defaultAddress?: Record<string, any> | null;
  createdAt: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  phone: string;
  expiresInSeconds: number;
  mockOtp?: string | null;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  sessionToken?: string;
  expiresAt?: string | null;
  customer?: CustomerProfile | null;
}

export interface SessionValidationResult {
  isValid: boolean;
  customer?: CustomerProfile | null;
  deviceId?: string | null;
  expiresAt?: string | null;
}

class CustomerAuthService {
  private readonly TOKEN_STORAGE_KEY = 'vy_customer_token';
  private readonly PROFILE_STORAGE_KEY = 'vy_customer_profile';
  private cachedProfile: CustomerProfile | null = null;
  private listeners: Array<(isAuthenticated: boolean, profile: CustomerProfile | null) => void> = [];

  constructor() {
    this.hydrateFromStorage();
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined' && (window as any).__STORE_API_URL__) {
      return (window as any).__STORE_API_URL__;
    }
    return 'http://adminapi.vayyarifashions.com';
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const rawProfile = window.localStorage.getItem(this.PROFILE_STORAGE_KEY);
      if (rawProfile) {
        this.cachedProfile = JSON.parse(rawProfile);
      }
    } catch (e) {
      console.warn('[CustomerAuthService] Failed to hydrate profile from localStorage:', e);
    }
  }

  public getSessionToken(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(this.TOKEN_STORAGE_KEY);
  }

  public getProfile(): CustomerProfile | null {
    return this.cachedProfile;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getSessionToken());
  }

  public subscribe(listener: (isAuthenticated: boolean, profile: CustomerProfile | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.isAuthenticated(), this.cachedProfile);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const isAuth = this.isAuthenticated();
    this.listeners.forEach((l) => l(isAuth, this.cachedProfile));
  }

  public async sendOtp(phone: string): Promise<SendOtpResult> {
    const deviceId = getDeviceId();
    const res = await fetch(`${this.getBaseUrl()}/api/v1/auth/whatsapp/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, deviceId }),
    });

    const data = await res.json();
    return data;
  }

  public async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
    const deviceId = getDeviceId();
    const res = await fetch(`${this.getBaseUrl()}/api/v1/auth/whatsapp/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, deviceId, otp }),
    });

    const data: VerifyOtpResult = await res.json();
    if (data.success && data.sessionToken && data.customer) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.TOKEN_STORAGE_KEY, data.sessionToken);
        window.localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(data.customer));
      }
      this.cachedProfile = data.customer;
      this.notifyListeners();
    }
    return data;
  }

  public async validateSession(): Promise<SessionValidationResult> {
    const token = this.getSessionToken();
    if (!token) {
      return { isValid: false };
    }

    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/auth/session`, {
        headers: { 'X-Customer-Token': token },
      });
      const data: SessionValidationResult = await res.json();
      if (data.isValid && data.customer) {
        this.cachedProfile = data.customer;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(data.customer));
        }
        this.notifyListeners();
      } else {
        this.logout();
      }
      return data;
    } catch (e) {
      console.warn('[CustomerAuthService] Session validation failed:', e);
      return { isValid: false };
    }
  }

  public async logout(): Promise<void> {
    const token = this.getSessionToken();
    if (token) {
      try {
        await fetch(`${this.getBaseUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'X-Customer-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token }),
        });
      } catch (e) {
        console.warn('[CustomerAuthService] Error notifying backend of logout:', e);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(this.PROFILE_STORAGE_KEY);
    }
    this.cachedProfile = null;
    this.notifyListeners();
  }
}

export const customerAuthService = new CustomerAuthService();
