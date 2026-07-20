import Constants from 'expo-constants';

import { Platform } from 'react-native';

export const getApiBaseHost = () => {
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

export const getIdentityApiUrl = () => `http://${getApiBaseHost()}:5198`;
export const getSearchApiUrl = () => `http://${getApiBaseHost()}:5002`;
export const getWhatsappProcessorUrl = () => `http://${getApiBaseHost()}:3001`;
export const getOtelEndpointUrl = () => `http://${getApiBaseHost()}:4318/v1/traces`;
