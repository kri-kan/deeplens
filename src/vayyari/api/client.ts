import { wrapInSpan } from '../utils/telemetry';
import { ApiResponse, ApiError, ApiException } from '../types/api';
import { EventEmitter } from 'eventemitter3';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  _isRetry?: boolean; // internal flag to prevent infinite refresh loops
}

// Global event bus for auth events
export const authEvents = new EventEmitter();
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

class ApiClient {
  private baseUrl: string;
  private getAccessToken?: () => Promise<string | null>;

  constructor(baseUrl: string, getAccessToken?: () => Promise<string | null>) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.getAccessToken = getAccessToken;
  }

  /**
   * Performs a typed GET request.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * Performs a typed POST request.
   */
  async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Performs a typed POST request with FormData.
   */
  async postFormData<T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Headers are automatically set for FormData
        ...options?.headers,
      },
    });
  }

  /**
   * Performs a typed PUT request.
   */
  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Performs a typed PATCH request.
   */
  async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }
  /**
   * Performs a typed DELETE request.
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Internal request handler with telemetry and standardized error parsing.
   */
  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const spanName = `API ${options.method || 'GET'} ${path}`;

    // Inject token if available (uses proactive refresh when near expiry)
    let headers = { ...options.headers };
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    console.log(`[API Request] ${options.method || 'GET'} ${url}`);
    return wrapInSpan(spanName, async () => {
      try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
          // ── 401 Intercept: attempt silent refresh once ──────────────────
          if (response.status === 401 && !options._isRetry) {
            console.warn('[ApiClient] Got 401, attempting silent token refresh...');
            const { identityService } = await import('../services/identity.service');
            const newToken = await identityService.refreshToken();

            if (newToken) {
              // Retry original request with new token
              return this.request<T>(path, {
                ...options,
                _isRetry: true,
                headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
              });
            } else {
              // Refresh failed — kick user to login
              console.error('[ApiClient] Silent refresh failed. Redirecting to login.');
              authEvents.emit(AUTH_UNAUTHORIZED_EVENT);
              throw new ApiException({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' }, 401);
            }
          }

          console.error(`[API Error] ${options.method || 'GET'} ${url} failed with status: ${response.status}`);
          await this.handleError(response);
        }

        const result: ApiResponse<T> = await response.json();
        
        // Handle standardized API response pattern
        if (result.success === false && result.error) {
          throw new ApiException(result.error, response.status);
        }

        return result.data ?? (result as T);
      } catch (error) {
        if (error instanceof ApiException) throw error;
        
        const networkError: ApiError = {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        };
        throw new ApiException(networkError, 0);
      }
    });
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    return url.toString();
  }

  private async handleError(response: Response): Promise<never> {
    let error: ApiError;
    try {
      const result: ApiResponse<any> = await response.json();
      error = result.error || {
        code: `HTTP_${response.status}`,
        message: result.message || response.statusText,
      };
    } catch {
      error = {
        code: `HTTP_${response.status}`,
        message: response.statusText,
      };
    }
    throw new ApiException(error, response.status);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { identityService } from '../services/identity.service';

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
