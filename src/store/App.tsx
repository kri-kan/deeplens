import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from './tamagui.config';
import { ThemeProvider } from './src/theme';

// Context Providers
import { NavigationProvider } from './src/app/NavigationContext';
import { PWAProvider } from './src/context/PWAContext';
import { PermissionsProvider } from './src/context/PermissionsContext';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { ToastProvider } from './src/context/ToastContext';

// Master App Shell
import { AppShell } from './src/app/AppShell';

// Web Viewport Lock: Guarantee zero horizontal scroll across all device form factors
if (typeof document !== 'undefined') {
  const styleId = 'vayyari-viewport-lock';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }
      *, *:before, *:after {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <ThemeProvider>
        <NavigationProvider initialRoute="home">
          <PWAProvider>
            <PermissionsProvider>
              <AuthProvider>
                <OnboardingProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <ToastProvider>
                        <StatusBar style="light" />
                        <AppShell />
                      </ToastProvider>
                    </WishlistProvider>
                  </CartProvider>
                </OnboardingProvider>
              </AuthProvider>
            </PermissionsProvider>
          </PWAProvider>
        </NavigationProvider>
      </ThemeProvider>
    </TamaguiProvider>
  );
}
