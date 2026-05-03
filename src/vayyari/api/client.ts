import { EventEmitter } from 'eventemitter3';
import ApiClient from './base';
import { identityService } from '../services/identity.service';

// Global event bus for auth events
export const authEvents = new EventEmitter();
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Singleton instances — use proactive token refresh on every request
export const searchApiClient = new ApiClient(
  process.env.EXPO_PUBLIC_SEARCH_API_URL!,
  () => identityService.getAccessTokenWithRefresh()
);

export const productMgmtApiClient = new ApiClient(
  process.env.EXPO_PUBLIC_SEARCH_API_URL!,
  () => identityService.getAccessTokenWithRefresh()
);

export default ApiClient;
