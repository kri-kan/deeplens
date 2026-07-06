import { EventEmitter } from 'eventemitter3';
import { ApiClient } from './base';
import { identityService } from '../services/identity.service';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


// Global event bus for auth events
export const authEvents = new EventEmitter();
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Singleton instances — use proactive token refresh on every request
export const searchApiClient = new ApiClient(
  getSearchApiUrl(),
  () => identityService.getAccessTokenWithRefresh()
);

export const productMgmtApiClient = new ApiClient(
  getSearchApiUrl(),
  () => identityService.getAccessTokenWithRefresh()
);

export default ApiClient;
