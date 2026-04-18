import ApiClient from '../api/client';
import { TokenResponse, UserProfile } from '../types/auth';
import { API_ROUTES } from '../constants/api-routes';

const identityApiUrl = process.env.EXPO_PUBLIC_IDENTITY_API_URL!;

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

      return response.json();
    } catch (err) {
      console.error(`[IdentityService] Network error during login to ${identityApiUrl}:`, err);
      throw err;
    }
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
