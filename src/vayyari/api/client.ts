import { wrapInSpan } from '../utils/telemetry';
import { ApiResponse, ApiError, ApiException } from '../types/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

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
   * Internal request handler with telemetry and standardized error parsing.
   */
  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const spanName = `API ${options.method || 'GET'} ${path}`;

    // Inject token if available
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

// Singleton instances with token injection
export const searchApiClient = new ApiClient(
  process.env.EXPO_PUBLIC_SEARCH_API_URL!,
  async () => await AsyncStorage.getItem('auth_token')
);

export default ApiClient;
