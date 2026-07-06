import Constants from 'expo-constants';

export const getApiBaseHost = () => {
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    return Constants.expoConfig.hostUri.split(':')[0];
  }
  // Fallback if not available or in production (use your prod URL here later)
  return '192.168.0.170';
};

export const getIdentityApiUrl = () => `http://${getApiBaseHost()}:5198`;
export const getSearchApiUrl = () => `http://${getApiBaseHost()}:5002`;
export const getWhatsappProcessorUrl = () => `http://${getApiBaseHost()}:3001`;
export const getOtelEndpointUrl = () => `http://${getApiBaseHost()}:4318/v1/traces`;
