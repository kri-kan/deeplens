import { Platform, Dimensions } from 'react-native';

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
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const isPWA = isWeb && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  let userAgent = 'native';
  let screenRes = 'unknown';
  let language = 'en';
  let timezone = 'UTC';
  let os: string = Platform.OS;
  let browser = 'expo-native';
  let model = Platform.OS === 'android' ? 'Android Device' : Platform.OS === 'ios' ? 'Apple Device' : 'Desktop';
  let cores = 1;

  if (isWeb) {
    userAgent = window.navigator?.userAgent || 'unknown';
    language = window.navigator?.language || 'en';
    cores = window.navigator?.hardwareConcurrency || 4;
    screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}@${window.devicePixelRatio || 1}`;

    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    // Parse OS & Browser
    if (/Android/i.test(userAgent)) {
      os = 'Android';
      const match = userAgent.match(/Android\s+([\d.]+)/);
      if (match) os += ` ${match[1]}`;
      const modelMatch = userAgent.match(/;\s*([^;)]+)\s+Build/);
      if (modelMatch) model = modelMatch[1];
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

    if (/Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Edge/i.test(userAgent)) {
      browser = 'Edge';
    }
  } else {
    // React Native environment
    const dims = Dimensions.get('window');
    screenRes = `${Math.round(dims.width)}x${Math.round(dims.height)}`;
  }

  const entropyString = [userAgent, screenRes, language, timezone, cores, os, browser].join('|');
  const hash = 'fp_' + fnv1a(entropyString);

  const effectivePlatform: 'web' | 'pwa' | 'android' | 'ios' = isPWA
    ? 'pwa'
    : (Platform.OS as any) === 'android'
    ? 'android'
    : (Platform.OS as any) === 'ios'
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
        isPWA,
      },
    },
  };
}

export function getOrCreatePersistentDeviceId(): DeviceMetadata {
  const { hash, specs } = computeDeviceFingerprint();

  let storedId: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    storedId = window.localStorage.getItem('vy_device_id');
    if (!storedId) {
      // Deterministically seed device ID with fingerprint hash + timestamp salt
      storedId = `dev_${hash.replace('fp_', '')}_${Date.now().toString(36)}`;
      window.localStorage.setItem('vy_device_id', storedId);
      window.localStorage.setItem('vy_device_fp', hash);
    }
  } else {
    storedId = `dev_${hash.replace('fp_', '')}_native`;
  }

  return {
    deviceId: storedId,
    fingerprintHash: hash,
    ...specs,
  };
}
