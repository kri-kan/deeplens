import { wrapInSpan } from '../utils/telemetry';
import { ApiResponse, ApiError, ApiException } from '../types/api';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  _isRetry?: boolean; // internal flag to prevent infinite refresh loops
}

export class ApiClient {
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
  async delete<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
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
          // Intercept 401 for silent refresh
          if (response.status === 401 && !options._isRetry) {
            console.warn('[ApiClient] Got 401, attempting silent token refresh...');
            const { identityService } = await import('../services/identity.service');
            const newToken = await identityService.refreshToken();

            if (newToken) {
              return this.request<T>(path, {
                ...options,
                _isRetry: true,
                headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
              });
            } else {
              const { authEvents, AUTH_UNAUTHORIZED_EVENT } = await import('./client');
              authEvents.emit(AUTH_UNAUTHORIZED_EVENT);
              throw new ApiException({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' }, 401);
            }
          }

          console.error(`[API Error] ${options.method || 'GET'} ${url} failed with status: ${response.status}`);
          await this.handleError(response);
        }

        if (response.status === 204) return {} as T;

        const text = await response.text();
        if (!text) return {} as T;

        const result: ApiResponse<T> = JSON.parse(text);
        if (result.success === false && result.error) {
          throw new ApiException(result.error, response.status);
        }

        return (result.data !== undefined ? result.data : (result as T)) as T;
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
    const text = await response.text();
    
    try {
      const result: any = text ? JSON.parse(text) : {};
      console.error('[API Error Detail]', { status: response.status, result });
      
      if (typeof result.error === 'string') {
        error = {
          code: `HTTP_${response.status}`,
          message: result.error,
        };
      } else {
        error = result.error || {
          code: `HTTP_${response.status}`,
          message: result.message || response.statusText || 'Unknown error',
        };
      }
    } catch {
      console.error('[API Error Detail] Raw response (non-JSON):', text);
      error = {
        code: `HTTP_${response.status}`,
        message: text.slice(0, 100) || response.statusText || 'Failed to parse error response',
      };
    }
    throw new ApiException(error, response.status);
  }
}

export default ApiClient;
