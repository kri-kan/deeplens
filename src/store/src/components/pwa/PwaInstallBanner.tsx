import React from 'react';
import { Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Download, X, Monitor, Smartphone, Check } from 'lucide-react-native';
import { usePWA } from '../../context/PWAContext';
import { useTheme } from '../../theme';

export interface PwaInstallBannerProps {
  isDesktop?: boolean;
  appName?: string;
  onDismiss?: () => void;
}

export function PwaInstallBanner({
  isDesktop = true,
  appName = 'Vayyari Luxury Store',
  onDismiss,
}: PwaInstallBannerProps) {
  const { tokens } = useTheme();
  const { isInstalled, showInstallBanner, setShowInstallBanner, promptInstall, isOffline } = usePWA();

  if (Platform.OS !== 'web' || isInstalled || !showInstallBanner) return null;

  const handleInstallClick = async () => {
    await promptInstall();
  };

  const handleDismissClick = () => {
    setShowInstallBanner(false);
    onDismiss?.();
  };

  return (
    <XStack
      width="100%"
      maxWidth="100%"
      overflow="hidden"
      backgroundColor="#0D1B2A"
      borderBottomWidth={1}
      borderBottomColor="#D4AF37"
      paddingVertical={10}
      paddingHorizontal={16}
      justifyContent="center"
      alignItems="center"
      zIndex={999}
    >
      <XStack
        width="100%"
        maxWidth={1200}
        overflow="hidden"
        justifyContent="space-between"
        alignItems="center"
        gap={12}
        flexWrap="wrap"
      >
        <XStack gap={10} alignItems="center" flex={1} minWidth={0} overflow="hidden">
          <YStack
            width={34}
            height={34}
            flexShrink={0}
            borderRadius={8}
            backgroundColor="#1A365D"
            alignItems="center"
            justifyContent="center"
          >
            {isDesktop ? (
              <Monitor size={18} color="#D4AF37" />
            ) : (
              <Smartphone size={18} color="#D4AF37" />
            )}
          </YStack>

          <YStack flex={1} minWidth={0} overflow="hidden">
            <XStack alignItems="center" gap={8} flexWrap="wrap">
              <Text fontSize={13} fontWeight="800" color="#FAF7F2" numberOfLines={1}>
                {isDesktop ? 'Download Vayyari Desktop App' : 'Add Vayyari to Home Screen'}
              </Text>
              <XStack backgroundColor="#1B4332" paddingHorizontal={6} paddingVertical={2} borderRadius={4} flexShrink={0}>
                <Text fontSize={10} fontWeight="700" color="#74C69D">
                  {isOffline ? 'OFFLINE ACTIVE' : 'OFFLINE READY'}
                </Text>
              </XStack>
            </XStack>
            <Text fontSize={11} color="#C4CCD3" numberOfLines={1} ellipsizeMode="tail">
              {isDesktop
                ? 'Instant launch and offline access directly from your desktop dock.'
                : 'Instant launch and offline access just like a native app.'}
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={10} flexShrink={0}>
          <XStack
            cursor="pointer"
            paddingHorizontal={10}
            paddingVertical={6}
            borderRadius={6}
            onPress={handleDismissClick}
            hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text fontSize={11} fontWeight="600" color="#9AA5B1">
              Maybe Later
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            backgroundColor="#E53935"
            paddingHorizontal={14}
            paddingVertical={6}
            borderRadius={6}
            alignItems="center"
            gap={6}
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.97 }}
            onPress={handleInstallClick}
          >
            <Download size={13} color="#FFFFFF" />
            <Text fontSize={11} fontWeight="800" color="#FFFFFF" letterSpacing={0.5}>
              INSTALL APP
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            padding={4}
            borderRadius={4}
            onPress={handleDismissClick}
            hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <X size={15} color="#9AA5B1" />
          </XStack>
        </XStack>
      </XStack>
    </XStack>
  );
}
