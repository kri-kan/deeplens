import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LuViewfinderLens } from '@/components/tamagui-ui/icons/lu';
import { useVisualSearchNavigation } from '@/hooks/useVisualSearchNavigation';

export const isVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0];
  const lower = cleanUrl.toLowerCase();
  return (
    lower.endsWith('.mov') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.includes('videos/') ||
    cleanUrl.includes('.MOV') ||
    cleanUrl.includes('.MP4') ||
    cleanUrl.endsWith('.MOV') ||
    cleanUrl.endsWith('.MP4')
  );
};

export interface VisualLensButtonProps {
  imageUri?: string | null;
  storagePath?: string | null;
  mediaId?: string | null;
  postId?: string | null;
  size?: number;
  iconSize?: number;
  variant?: 'neon' | 'glass';
  style?: StyleProp<ViewStyle>;
  onBeforeNavigate?: () => void;
  onCustomSearch?: (uri: string) => void;
  accessibilityLabel?: string;
}

export const VisualLensButton: React.FC<VisualLensButtonProps> = ({
  imageUri,
  storagePath,
  mediaId,
  postId,
  size = 40,
  iconSize = 18,
  variant = 'neon',
  style,
  onBeforeNavigate,
  onCustomSearch,
  accessibilityLabel = 'Find visually similar products in catalog',
}) => {
  const { openVisualSearch } = useVisualSearchNavigation();

  const handlePress = useCallback(() => {
    if (!imageUri && !storagePath && !mediaId && !postId) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (onCustomSearch && imageUri) {
      onBeforeNavigate?.();
      onCustomSearch(imageUri);
      return;
    }

    openVisualSearch({
      imageUri,
      storagePath,
      mediaId,
      postId,
      onBeforeNavigate,
    });
  }, [
    imageUri,
    storagePath,
    mediaId,
    postId,
    onBeforeNavigate,
    onCustomSearch,
    openVisualSearch,
  ]);

  // Suppress rendering if target media is a video or missing
  if (!imageUri && !storagePath) return null;
  if (imageUri && isVideoUrl(imageUri)) return null;

  const isNeon = variant === 'neon';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.base,
        isNeon ? styles.neon : styles.glass,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <LuViewfinderLens size={iconSize} color={isNeon ? '#22D3EE' : '#FFFFFF'} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  neon: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1.5,
    borderColor: '#06B6D4',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
