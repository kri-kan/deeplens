import Constants from 'expo-constants';

import { Platform } from 'react-native';

export const getApiBaseHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  if (__DEV__ && Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return host;
    }
  }
  
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  
  return '127.0.0.1';
};

export const getIdentityApiUrl = () => `http://${getApiBaseHost()}:5000`;
export const getSearchApiUrl = () => `http://${getApiBaseHost()}:5000`;
export const getWhatsappProcessorUrl = () => `http://${getApiBaseHost()}:3005`;
export const getOtelEndpointUrl = () => `http://${getApiBaseHost()}:4318/v1/traces`;
