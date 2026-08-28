/* eslint-disable camelcase */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { identityService, TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY, LAST_ACTIVITY_KEY } from '../services/identity.service';
import { AuthState } from '../types/auth';
import { wrapInSpan } from '../utils/telemetry';
import { authEvents, AUTH_UNAUTHORIZED_EVENT } from '../api/client';
import { router } from 'expo-router';

const USER_KEY = 'auth_user';


export const ALL_AUTH_STORAGE_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
  LAST_ACTIVITY_KEY,
  'auth_capabilities',
  'auth_permissions',
  'auth_roles',
  'auth_capabilities_version',
];

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  const loadStoredData = useCallback(async () => {
    console.log('[AuthContext] Starting loadStoredData...');
    try {
      // Safety timeout to prevent hanging if AsyncStorage or network hangs
      const storageFetch = async () => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        const userData = await AsyncStorage.getItem(USER_KEY);
        const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
        return { token, refreshToken, userData, expiryStr };
      };

      const result = await Promise.race([
        storageFetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]) as { token: string | null; refreshToken: string | null; userData: string | null; expiryStr: string | null };
      
      const { token, refreshToken, userData, expiryStr } = result;
      console.log('[AuthContext] Stored data fetched:', { hasToken: !!token, hasRefreshToken: !!refreshToken, hasUser: !!userData });
      
      if (token && userData) {
        let activeToken = token;
        const now = Date.now();
        const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
        const isExpiringSoon = expiry > 0 && expiry < (now + 5 * 60 * 1000); // within 5 min or already expired

        if (isExpiringSoon && refreshToken) {
          console.log('[AuthContext] Token expired or expiring soon on cold start, attempting silent refresh...');
          try {
            const refreshedToken = await identityService.refreshToken();
            if (refreshedToken) {
              activeToken = refreshedToken;
              console.log('[AuthContext] Cold start silent refresh successful.');
            }
          } catch (refreshErr) {
            console.warn('[AuthContext] Cold start silent refresh failed, falling back to stored session:', refreshErr);
          }
        }

        setState({
          token: activeToken,
          user: JSON.parse(userData),
          isLoading: false,
        });
      } else if (refreshToken) {
        // We have a refresh token but no active access token
        console.log('[AuthContext] Refresh token present without access token, attempting refresh...');
        const refreshedToken = await identityService.refreshToken();
        if (refreshedToken && userData) {
          setState({
            token: refreshedToken,
            user: JSON.parse(userData),
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to load auth data or timed out:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
    console.log('[AuthContext] loadStoredData complete, isLoading initialized to false.');
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // ── Listen for 401 events from ApiClient ──────────────────────────────────
  useEffect(() => {
    const handleUnauthorized = async () => {
      console.warn('[AuthContext] Session expired (401). Signing out...');
      await AsyncStorage.multiRemove(ALL_AUTH_STORAGE_KEYS);
      setState({ token: null, user: null, isLoading: false });
      router.replace('/login');
    };

    authEvents.on(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => { authEvents.off(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized); };
  }, []);

  const signIn = async (email: string, password: string) => {
    return wrapInSpan('AuthContext: signIn', async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        const response = await identityService.login(email, password);
         
        const { access_token } = response;
        
        // Fetch full profile immediately
        const profile = await identityService.getProfile(access_token);
        
        await AsyncStorage.setItem(TOKEN_KEY, access_token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
        
        setState({
          token: access_token,
          user: profile,
          isLoading: false,
        });
      } catch (err) {
        console.error('[AuthContext:signIn] Error:', err);
        setState(prev => ({ ...prev, isLoading: false }));
        throw err;
      }
    });
  };

  const signOut = async () => {
    return wrapInSpan('AuthContext: signOut', async () => {
      await AsyncStorage.multiRemove(ALL_AUTH_STORAGE_KEYS);
      setState({
        token: null,
        user: null,
        isLoading: false,
      });
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
