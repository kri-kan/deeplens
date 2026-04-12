export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiException extends Error {
  constructor(public error: ApiError, public status: number) {
    super(error.message);
    this.name = 'ApiException';
  }
}
