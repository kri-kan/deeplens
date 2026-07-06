import Constants from 'expo-constants';

export const getApiBaseHost = () => {
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return host;
    }
  }
  // Fallback to Tailscale IP (100.98.244.8) rather than 127.0.0.1
  // since loopback is unreachable from Android devices/emulators.
  return '100.98.244.8';
};

export const getIdentityApiUrl = () => `http://${getApiBaseHost()}:5198`;
export const getSearchApiUrl = () => `http://${getApiBaseHost()}:5002`;
export const getWhatsappProcessorUrl = () => `http://${getApiBaseHost()}:3001`;
export const getOtelEndpointUrl = () => `http://${getApiBaseHost()}:4318/v1/traces`;
