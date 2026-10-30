// Vayyari Store Prelaunch Customer Auth Service (Epic 1)

import { getOrCreatePersistentDeviceId } from './telemetry';

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

const TOKEN_KEY = 'vy_customer_token';
const PROFILE_KEY = 'vy_customer_profile';

function getApiUrl(): string {
  return '/api'; // Proxied to Store.Api via Vite or Nginx
}

export async function sendWhatsAppOtp(phone: string): Promise<SendOtpResult> {
  const fp = getOrCreatePersistentDeviceId();
  const res = await fetch(`${getApiUrl()}/v1/auth/whatsapp/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, deviceId: fp.deviceId }),
  });
  return res.json();
}

export async function verifyWhatsAppOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const fp = getOrCreatePersistentDeviceId();
  const res = await fetch(`${getApiUrl()}/v1/auth/whatsapp/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, deviceId: fp.deviceId, otp }),
  });

  const data: VerifyOtpResult = await res.json();
  if (data.success && data.sessionToken && data.customer) {
    localStorage.setItem(TOKEN_KEY, data.sessionToken);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data.customer));
  }
  return data;
}

export async function validateCustomerSession(): Promise<SessionValidationResult> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { isValid: false };

  try {
    const res = await fetch(`${getApiUrl()}/v1/auth/session`, {
      headers: { 'X-Customer-Token': token },
    });
    const data: SessionValidationResult = await res.json();
    if (data.isValid && data.customer) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.customer));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
    }
    return data;
  } catch (e) {
    console.warn('[storePrelaunch] Auth session validation error:', e);
    return { isValid: false };
  }
}

export async function logoutCustomer(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch(`${getApiUrl()}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'X-Customer-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      });
    } catch {}
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getStoredCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isCustomerAuthenticated(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}
