import { ApiClient } from './base';
import { identityService } from '../services/identity.service';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';
export { authEvents, AUTH_UNAUTHORIZED_EVENT } from './events';

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
