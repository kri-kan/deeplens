import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CustomerProfile } from '../api/customerAuthApi';

export interface CustomerAuthState {
  sessionToken: string | null;
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  phoneInput: string;
  otpInput: string;
  resendCountdown: number;
  mockOtpHint: string | null;
}

const getInitialToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('vy_customer_token');
  }
  return null;
};

const initialState: CustomerAuthState = {
  sessionToken: getInitialToken(),
  customer: null,
  isAuthenticated: Boolean(getInitialToken()),
  isAuthModalOpen: false,
  phoneInput: '',
  otpInput: '',
  resendCountdown: 0,
  mockOtpHint: null,
};

export const customerAuthSlice = createSlice({
  name: 'customerAuth',
  initialState,
  reducers: {
    setAuthModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAuthModalOpen = action.payload;
      if (!action.payload) {
        state.otpInput = '';
        state.mockOtpHint = null;
      }
    },
    setPhoneInput: (state, action: PayloadAction<string>) => {
      state.phoneInput = action.payload;
    },
    setOtpInput: (state, action: PayloadAction<string>) => {
      state.otpInput = action.payload;
    },
    setResendCountdown: (state, action: PayloadAction<number>) => {
      state.resendCountdown = action.payload;
    },
    decrementCountdown: (state) => {
      if (state.resendCountdown > 0) {
        state.resendCountdown -= 1;
      }
    },
    setMockOtpHint: (state, action: PayloadAction<string | null>) => {
      state.mockOtpHint = action.payload;
    },
    loginSuccess: (state, action: PayloadAction<{ sessionToken: string; customer: CustomerProfile }>) => {
      state.sessionToken = action.payload.sessionToken;
      state.customer = action.payload.customer;
      state.isAuthenticated = true;
      state.isAuthModalOpen = false;
      state.otpInput = '';
      state.mockOtpHint = null;

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('vy_customer_token', action.payload.sessionToken);
        window.localStorage.setItem('vy_customer_profile', JSON.stringify(action.payload.customer));
      }
    },
    logoutSuccess: (state) => {
      state.sessionToken = null;
      state.customer = null;
      state.isAuthenticated = false;
      state.isAuthModalOpen = false;
      state.phoneInput = '';
      state.otpInput = '';
      state.mockOtpHint = null;

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('vy_customer_token');
        window.localStorage.removeItem('vy_customer_profile');
      }
    },
    setCustomerProfile: (state, action: PayloadAction<CustomerProfile | null>) => {
      state.customer = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      if (typeof window !== 'undefined' && window.localStorage && action.payload) {
        window.localStorage.setItem('vy_customer_profile', JSON.stringify(action.payload));
      }
    },
  },
});

export const {
  setAuthModalOpen,
  setPhoneInput,
  setOtpInput,
  setResendCountdown,
  decrementCountdown,
  setMockOtpHint,
  loginSuccess,
  logoutSuccess,
  setCustomerProfile,
} = customerAuthSlice.actions;

export const customerAuthReducer = customerAuthSlice.reducer;
