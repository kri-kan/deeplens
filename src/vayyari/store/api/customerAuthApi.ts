import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getStoreApiUrl } from '@/utils/api-config';

export interface CustomerProfile {
  userId: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  defaultAddress?: Record<string, any> | null;
  createdAt: string;
}

export interface SendOtpRequest {
  phone: string;
  deviceId: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresInSeconds: number;
  mockOtp?: string | null;
}

export interface VerifyOtpRequest {
  phone: string;
  deviceId: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  sessionToken: string;
  expiresAt: string | null;
  customer: CustomerProfile | null;
}

export interface SessionValidationResponse {
  isValid: boolean;
  customer?: CustomerProfile | null;
  deviceId?: string | null;
  expiresAt?: string | null;
}

export interface UpdateCustomerProfileRequest {
  fullName?: string;
  email?: string;
  defaultAddress?: Record<string, any>;
}

export const customerAuthApi = createApi({
  reducerPath: 'customerAuthApi',
  baseQuery: fetchBaseQuery({
    baseUrl: getStoreApiUrl(),
    prepareHeaders: (headers) => {
      // Look up customer token from localStorage if in browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = window.localStorage.getItem('vy_customer_token');
        if (token) {
          headers.set('x-customer-token', token);
          headers.set('authorization', `Bearer ${token}`);
        }
      }
      return headers;
    },
  }),
  tagTypes: ['CustomerProfile', 'CustomerSession'],
  endpoints: (builder) => ({
    sendOtp: builder.mutation<SendOtpResponse, SendOtpRequest>({
      query: (body) => ({
        url: '/api/v1/auth/whatsapp/send-otp',
        method: 'POST',
        body,
      }),
    }),
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (body) => ({
        url: '/api/v1/auth/whatsapp/verify-otp',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CustomerProfile', 'CustomerSession'],
    }),
    validateSession: builder.query<SessionValidationResponse, void>({
      query: () => '/api/v1/auth/session',
      providesTags: ['CustomerSession'],
    }),
    getCustomerProfile: builder.query<CustomerProfile, void>({
      query: () => '/api/v1/auth/profile',
      providesTags: ['CustomerProfile'],
    }),
    updateCustomerProfile: builder.mutation<CustomerProfile, UpdateCustomerProfileRequest>({
      query: (body) => ({
        url: '/api/v1/auth/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CustomerProfile'],
    }),
    logoutCustomer: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/v1/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['CustomerProfile', 'CustomerSession'],
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useValidateSessionQuery,
  useGetCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
  useLogoutCustomerMutation,
} = customerAuthApi;
