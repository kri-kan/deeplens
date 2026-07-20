export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[] | string | number | boolean | null>;
}

export class ApiException extends Error {
  constructor(public error: ApiError, public status: number) {
    super(error?.message || 'Unknown Error');
    this.name = 'ApiException';
    // Fix prototype chain for instanceof checks when extending Error in TS
    Object.setPrototypeOf(this, ApiException.prototype);
  }
}
