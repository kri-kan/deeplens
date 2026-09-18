import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_LAN_HOST = '192.168.0.170';

export const getApiBaseHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // If identity API URL is configured with an explicit host (e.g. Tailscale or remote DNS), reuse that host
  const identityUrl = process.env.EXPO_PUBLIC_IDENTITY_API_URL;
  if (identityUrl) {
    try {
      const parsed = new URL(identityUrl);
      if (parsed.hostname && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
        return parsed.hostname;
      }
    } catch {
      // fallback to hostUri or default
    }
  }

  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return host;
    }
  }

  return DEFAULT_LAN_HOST;
};

export const getIdentityApiUrl = () =>
  process.env.EXPO_PUBLIC_IDENTITY_API_URL || 'http://adminapi.vayyarifashions.com';

export const getSearchApiUrl = () =>
  process.env.EXPO_PUBLIC_SEARCH_API_URL || 'http://adminapi.vayyarifashions.com';

export const getWhatsappProcessorUrl = () =>
  process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL || 'http://wa.vayyarifashions.com';

export const getOtelEndpointUrl = () =>
  process.env.EXPO_PUBLIC_OTEL_ENDPOINT || `http://${getApiBaseHost()}:4318/v1/traces`;

export const getStoreApiUrl = () =>
  process.env.EXPO_PUBLIC_STORE_API_URL || 'http://storeapi.vayyarifashions.com';
