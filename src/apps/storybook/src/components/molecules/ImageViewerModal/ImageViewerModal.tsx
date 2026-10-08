import React, { useEffect } from 'react';
import {
  Modal,
  Image,
  Pressable,
  Dimensions,
  Platform,
  BackHandler,
  StatusBar,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LuX, LuShare2 } from 'react-icons/lu';
import { shareImageUri } from '../../../utils/shareImage';

export interface ImageViewerModalProps {
  visible: boolean;
  imageUrl?: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  title,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const screenDimensions = Dimensions.get('window');

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible || !imageUrl) return null;

  const handleShare = () => {
    shareImageUri(imageUrl, title);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <YStack
        flex={1}
        backgroundColor="rgba(0,0,0,0.95)"
        position="relative"
      >
        {/* Header Bar */}
        <XStack
          paddingTop={Platform.OS === 'android' ? Math.max(insets.top, 16) : insets.top + 8}
          paddingBottom={12}
          paddingHorizontal={16}
          alignItems="center"
          justifyContent="space-between"
          zIndex={20}
          backgroundColor="rgba(0,0,0,0.5)"
        >
          {/* Close Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close image preview"
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <LuX size={20} color="#ffffff" />
          </Pressable>

          {/* Title */}
          <Text
            fontSize={14}
            fontWeight="600"
            color="#ffffff"
            numberOfLines={1}
            textAlign="center"
            flex={1}
            paddingHorizontal={12}
          >
            {title || 'Image Preview'}
          </Text>

          {/* Share Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share image"
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <LuShare2 size={18} color="#ffffff" />
          </Pressable>
        </XStack>

        {/* Center Image Container */}
        <Pressable
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 8,
            paddingBottom: insets.bottom + 16,
          }}
          onPress={onClose}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: screenDimensions.width,
              height: screenDimensions.height * 0.78,
            }}
            resizeMode="contain"
          />
        </Pressable>
      </YStack>
    </Modal>
  );
};
