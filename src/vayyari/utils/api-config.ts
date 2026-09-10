import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_LAN_HOST = '192.168.0.170';

export const getApiBaseHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
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
  process.env.EXPO_PUBLIC_IDENTITY_API_URL || `http://${getApiBaseHost()}:5000`;

export const getSearchApiUrl = () =>
  process.env.EXPO_PUBLIC_SEARCH_API_URL || `http://${getApiBaseHost()}:5000`;

export const getWhatsappProcessorUrl = () =>
  process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL || `http://${getApiBaseHost()}:3005`;

export const getOtelEndpointUrl = () =>
  process.env.EXPO_PUBLIC_OTEL_ENDPOINT || `http://${getApiBaseHost()}:4318/v1/traces`;

export const getStoreApiUrl = () =>
  process.env.EXPO_PUBLIC_STORE_API_URL || `http://${getApiBaseHost()}:5200`;

