import Constants from 'expo-constants';

import { Platform } from 'react-native';

export const getApiBaseHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // Development mode: derive host from Metro bundler URI
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return host;
    }
  }

  // Explicit configuration from app.json extra
  const configuredHost = Constants.expoConfig?.extra?.apiHost;
  if (configuredHost) {
    return configuredHost;
  }

  // Fallback for Tailscale VPN connected devices
  return 'krikanserver.taild227d9.ts.net';
};

export const getIdentityApiUrl = () => `http://${getApiBaseHost()}:5000`;
export const getSearchApiUrl = () => `http://${getApiBaseHost()}:5000`;
export const getWhatsappProcessorUrl = () => `http://${getApiBaseHost()}:3005`;
export const getOtelEndpointUrl = () => `http://${getApiBaseHost()}:4318/v1/traces`;

