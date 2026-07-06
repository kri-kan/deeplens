/* eslint-disable camelcase */
import { ApiClient } from '../api/base';
import { TokenResponse, UserProfile } from '../types/auth';
import { API_ROUTES } from '../constants/api-routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


const identityApiUrl = getIdentityApiUrl();
export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry'; // unix ms
export const LAST_ACTIVITY_KEY = 'auth_last_refresh_at'; // unix ms

/**
 * How long (ms) before we proactively refresh on activity.
 * Set to 30 min: if user is active, token is extended every 30 min.
 * This makes the 15-day server-side sliding window reset with activity.
 */
const ACTIVITY_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Refresh the access token proactively if it's expiring in < this time.
 * Safety net in case activity-based refresh was missed.
 */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

class IdentityService {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient(identityApiUrl);
  }

  /**
   * Performs login using Resource Owner Password Grant.
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    // IdentityServer connect/token typically requires application/x-www-form-urlencoded
    const details: Record<string, string> = {
      grant_type: 'password',
      username: email,
      password: password,
      client_id: 'deeplens-webui-dev', // Using dev client that allows password grant
      scope: 'openid profile email roles deeplens.api deeplens.search offline_access',
    };

    const formBody = Object.keys(details)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
      .join('&');

    try {
      const response = await fetch(`${identityApiUrl}${API_ROUTES.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBody,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown response format' };
        }
        console.error(`[IdentityService] Login failed with status ${response.status}:`, errorData);
        throw new Error(errorData.error_description || errorData.error || 'Login failed');
      }

      const tokenResponse: TokenResponse = await response.json();

      // Persist tokens with expiry
      await this.persistTokens(tokenResponse);

      return tokenResponse;
    } catch (err) {
      console.error(`[IdentityService] Network error during login to ${identityApiUrl}:`, err);
      throw err;
    }
  }

  /**
   * Silently refreshes the access token using the stored refresh token.
   * Returns the new access token, or null if refresh fails.
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      console.warn('[IdentityService] No refresh token stored, cannot refresh.');
      return null;
    }

    const details: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'deeplens-webui-dev',
    };

    const formBody = Object.keys(details)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
      .join('&');

    try {
      const response = await fetch(`${identityApiUrl}${API_ROUTES.AUTH.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: formBody,
      });

      if (!response.ok) {
        console.warn('[IdentityService] Token refresh failed with status:', response.status);
        return null;
      }

      const tokenResponse: TokenResponse = await response.json();
      await this.persistTokens(tokenResponse);
      console.log('[IdentityService] Token silently refreshed.');
      return tokenResponse.access_token;
    } catch (err) {
      console.error('[IdentityService] Network error during token refresh:', err);
      return null;
    }
  }

  /**
   * Returns a valid access token.
   *
   * Sliding window logic:
   *  1. If it's been > 30 min since last refresh AND user has been active → refresh (extends server-side 15-day sliding window)
   *  2. If token is expiring in < 5 min (safety net) → refresh
   *  3. Otherwise use current token as-is
   */
  async getAccessTokenWithRefresh(): Promise<string | null> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const now = Date.now();
    const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    const lastRefreshStr = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;

    // 1. Activity-based sliding refresh: if been active but haven't refreshed in 30 min
    const activityTriggered = (now - lastRefresh) > ACTIVITY_REFRESH_INTERVAL_MS;

    // 2. Safety net: token expiring soon regardless of activity
    const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
    const expiryTriggered = expiry > 0 && expiry < (now + EXPIRY_BUFFER_MS);

    if (activityTriggered || expiryTriggered) {
      const reason = expiryTriggered ? 'token near expiry' : 'activity window elapsed';
      console.log(`[IdentityService] Proactive refresh triggered (${reason})`);
      const newToken = await this.refreshToken();
      if (newToken) return newToken;
      // If refresh failed but token isn't expired yet, continue with current token
      if (!expiryTriggered) return token;
    }

    return token;
  }

  /**
   * Persists tokens, expiry, and last refresh timestamp.
   */
  private async persistTokens(tokenResponse: TokenResponse): Promise<void> {
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, tokenResponse.access_token],
      [TOKEN_EXPIRY_KEY, expiresAt.toString()],
      [LAST_ACTIVITY_KEY, Date.now().toString()], // record when we last refreshed
      ...(tokenResponse.refresh_token ? [[REFRESH_TOKEN_KEY, tokenResponse.refresh_token] as [string, string]] : []),
    ]);
  }

  /**
   * Retrieves the current user profile using the access token.
   */
  async getProfile(token: string): Promise<UserProfile> {
    return this.client.get<UserProfile>(API_ROUTES.AUTH.PROFILE, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const identityService = new IdentityService();
export default identityService;
