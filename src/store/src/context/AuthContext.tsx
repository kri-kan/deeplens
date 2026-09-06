import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { mockAuthService, UserProfile } from '../services/mock/mockAuthService';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  continueAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  loginWithGoogle: async () => false,
  sendOtp: async () => ({ success: false, message: '' }),
  verifyOtp: async () => ({ success: false, message: '' }),
  continueAsGuest: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on startup
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('vayyari_auth_user');
      const savedToken = localStorage.getItem('vayyari_auth_token');
      if (savedUser && savedToken) {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } catch {}
      } else {
        // Auto-create guest user if no profile exists
        const guest = mockAuthService.createGuestUser();
        setUser(guest);
      }
    } else {
      setUser(mockAuthService.createGuestUser());
    }
    setIsLoading(false);
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await mockAuthService.signInWithGoogle();
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem('vayyari_auth_user', JSON.stringify(res.user));
          localStorage.setItem('vayyari_auth_token', res.token);
        }
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
    }
    setIsLoading(false);
    return false;
  };

  const sendOtp = async (phone: string) => {
    return mockAuthService.sendPhoneOtp(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setIsLoading(true);
    const res = await mockAuthService.verifyPhoneOtp(phone, otp);
    if (res.success && res.user && res.token) {
      setUser(res.user);
      setToken(res.token);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('vayyari_auth_user', JSON.stringify(res.user));
        localStorage.setItem('vayyari_auth_token', res.token);
      }
      setIsLoading(false);
      return { success: true, message: res.message || 'Success' };
    }
    setIsLoading(false);
    return { success: false, message: res.message || 'Verification failed' };
  };

  const continueAsGuest = () => {
    const guest = mockAuthService.createGuestUser();
    setUser(guest);
    setToken('guest-token');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('vayyari_auth_user', JSON.stringify(guest));
      localStorage.setItem('vayyari_auth_token', 'guest-token');
    }
  };

  const logout = () => {
    const guest = mockAuthService.createGuestUser();
    setUser(guest);
    setToken(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.removeItem('vayyari_auth_user');
      localStorage.removeItem('vayyari_auth_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && token !== 'guest-token' && !user?.isGuest,
        isLoading,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
        continueAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
