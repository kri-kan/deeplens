import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuDownload, LuX, LuMonitor, LuCheck, LuSmartphone } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface PwaInstallBannerProps {
  forceVisible?: boolean;
  isDesktop?: boolean;
  appName?: string;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PwaInstallBanner({
  forceVisible = false,
  isDesktop = true,
  appName = 'Vayyari Store',
  onInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  const { tokens } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(forceVisible);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      return;
    }

    // Listen for Chrome/Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, [forceVisible]);

  const handleInstallClick = async () => {
    onInstall?.();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // In web fallback when prompt is not available
      setInstalled(true);
      setTimeout(() => setVisible(false), 1200);
    }
  };

  const handleDismissClick = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible && !forceVisible) return null;

  return (
    <YStack
      width="100%"
      maxWidth={540}
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={12}
      padding={14}
      elevation={8}
      shadowColor="#000000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.12}
      shadowRadius={16}
      gap={10}
      role="banner"
      aria-label="Install App for Offline Use"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
        <XStack gap={12} flex={1} alignItems="center">
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={tokens.accentSubtle}
            alignItems="center"
            justifyContent="center"
          >
            {isDesktop ? (
              <LuMonitor size={22} color={tokens.accent} />
            ) : (
              <LuSmartphone size={22} color={tokens.accent} />
            )}
          </YStack>

          <YStack flex={1}>
            <XStack alignItems="center" gap={6}>
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                {installed ? 'App Installed!' : isDesktop ? 'Install Desktop App' : 'Add to Home Screen'}
              </Text>
              <XStack backgroundColor="#E8F5E9" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                <Text fontSize={10} fontWeight="700" color="#2E7D32">
                  OFFLINE READY
                </Text>
              </XStack>
            </XStack>

            <Text fontSize={12} color={tokens.textSecondary} lineHeight={16}>
              {installed
                ? `${appName} is ready for offline browsing and desktop launch.`
                : isDesktop
                ? `Install ${appName} on your computer dock for fast desktop access and offline browsing.`
                : `Install ${appName} for a native app experience and offline access.`}
            </Text>
          </YStack>
        </XStack>

        <XStack
          cursor="pointer"
          padding={4}
          borderRadius={6}
          hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
          onPress={handleDismissClick}
        >
          <LuX size={16} color={tokens.textMuted} />
        </XStack>
      </XStack>

      {!installed && (
        <XStack justifyContent="flex-end" alignItems="center" gap={10} paddingTop={2}>
          <XStack
            cursor="pointer"
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={6}
            hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            onPress={handleDismissClick}
          >
            <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
              Maybe Later
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            backgroundColor="#E53935"
            paddingHorizontal={16}
            paddingVertical={7}
            borderRadius={6}
            alignItems="center"
            gap={6}
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.97 }}
            onPress={handleInstallClick}
          >
            <LuDownload size={14} color="#FFFFFF" />
            <Text fontSize={12} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
              INSTALL APP
            </Text>
          </XStack>
        </XStack>
      )}

      {installed && (
        <XStack alignItems="center" gap={6} paddingTop={2}>
          <LuCheck size={14} color="#2E7D32" />
          <Text fontSize={11} fontWeight="700" color="#2E7D32">
            Installed successfully. You can now launch Vayyari from your desktop or dock!
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
