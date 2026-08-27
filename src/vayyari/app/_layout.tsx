import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { VayyariEmeraldTheme, VayyariEmeraldNocturneTheme } from '../constants/theme';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PermissionsProvider } from '../context/PermissionsContext';
import * as SplashScreen from 'expo-splash-screen';

import { ShareIntentProvider } from '../context/ShareIntentContext';
import { useShareIntent } from '../hooks/useShareIntent';
import { useOTAUpdate } from '../hooks/useOTAUpdate';

console.log('[RootLayout] Global execution started');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// eslint-disable-next-line camelcase
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <ShareIntentProvider>
            <InnerRootLayout />
          </ShareIntentProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function InnerRootLayout() {
  const { colorScheme } = useAppTheme();
  const { token, isLoading } = useAuth();
  useShareIntent();
  useOTAUpdate();

  console.log('[RootLayout] InnerRootLayout render:', { colorScheme, isLoading, hasToken: !!token });

  const paperTheme = colorScheme === 'dark' ? VayyariEmeraldNocturneTheme : VayyariEmeraldTheme;
  const navTheme = colorScheme === 'dark' 
    ? { ...NavDarkTheme, colors: { ...NavDarkTheme.colors, background: VayyariEmeraldNocturneTheme.colors.background, card: VayyariEmeraldNocturneTheme.colors.surface } } 
    : { ...NavDefaultTheme, colors: { ...NavDefaultTheme.colors, background: VayyariEmeraldTheme.colors.background, card: VayyariEmeraldTheme.colors.surface } };


  useEffect(() => {
    if (colorScheme && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [colorScheme, isLoading]);

  // Proactive auth navigation: Ensure unauthenticated users are routed to /login immediately
  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [isLoading, token]);

  // Fail-safe: hide splash screen after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Lazy load OpenTelemetry to prevent slowing down the initial LCP on native platforms
    if (Platform.OS !== 'web') {
      setTimeout(async () => {
        try {
          const { initOtel } = await import('@/utils/telemetry');
          await initOtel();
        } catch (err) {
          console.warn('Failed to initialize OpenTelemetry', err);
        }
      }, 1000);
    }
  }, []);



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <NavigationThemeProvider value={navTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            {!token ? (
              <Stack.Screen name="login" options={{ title: 'Sign In' }} />
            ) : (
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            )}
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Settings', headerShown: true }} />
            <Stack.Screen name="ai" options={{ animation: 'slide_from_left', headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
