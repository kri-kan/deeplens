import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { VayyariEmeraldTheme, VayyariEmeraldNocturneTheme } from '../constants/theme';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as SplashScreen from 'expo-splash-screen';

console.log('[RootLayout] Global execution started');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerRootLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

function InnerRootLayout() {
  const { colorScheme } = useAppTheme();
  const { token, isLoading } = useAuth();

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

  // Fail-safe: hide splash screen after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Lazy load OpenTelemetry to prevent slowing down the initial LCP
    setTimeout(async () => {
      try {
        const { initOtel } = await import('@/utils/telemetry');
        initOtel();
      } catch (err) {
        console.warn('Failed to initialize OpenTelemetry', err);
      }
    }, Number(process.env.EXPO_PUBLIC_OTEL_LAZY_LOAD_DELAY_MS || 1000));
  }, []);

  return (
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
            <>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
            </>
          )}
        </Stack>
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </PaperProvider>
  );
}
