import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  BackHandler,
  Platform,
  Share,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LuX, LuShare2 } from '@/components/tamagui-ui/icons/lu';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { VisualLensButton, isVideoUrl } from '@/components/tamagui-ui/atoms/VisualLensButton';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ImageViewerModalProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void; // Backwards-compatible alias for onClose
  imageUrl?: string | null;
  imageUrls?: string[];
  initialIndex?: number;
  title?: string;
  onVisualSearch?: (url: string) => void;
}

const UnifiedVideoPlayer = ({ uri, isActive }: { uri: string; isActive: boolean }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    if (isActive) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <View style={styles.mediaContainer}>
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
};

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  onClose,
  onDismiss,
  imageUrl,
  imageUrls,
  initialIndex = 0,
  title,
  onVisualSearch,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const handleClose = useCallback(() => {
    onClose?.();
    onDismiss?.();
  }, [onClose, onDismiss]);

  const images = useMemo(() => {
    if (imageUrls && imageUrls.length > 0) return imageUrls.filter(Boolean) as string[];
    if (imageUrl) return [imageUrl];
    return [];
  }, [imageUrls, imageUrl]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const flatListRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (visible && images.length > 0) {
      const target = Math.min(Math.max(0, initialIndex), images.length - 1);
      setCurrentIndex(target);
      setIsZoomed(false);
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({ index: target, animated: false });
        } catch {
          // Safe layout timing fallback
        }
      }, 50);
    }
  }, [visible, initialIndex, images.length]);

  // Handle hardware back press on Android
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, handleClose]);

  const currentUrl = images[currentIndex];

  const handleShare = useCallback(() => {
    if (!currentUrl) return;
    Share.share(
      Platform.OS === 'ios'
        ? { url: currentUrl, message: title }
        : { message: `${title ? `${title}\n` : ''}${currentUrl}` }
    ).catch(() => {});
  }, [currentUrl, title]);

  if (!visible || images.length === 0) return null;

  const topOffset = Platform.OS === 'android' ? Math.max(insets.top, 16) : insets.top + 8;
  const viewerHeight = SCREEN_HEIGHT - topOffset - insets.bottom - 40;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <GestureHandlerRootView style={styles.container}>
        {/* Floating Top Control Bar */}
        <XStack
          position="absolute"
          top={topOffset}
          left={16}
          right={16}
          zIndex={30}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Top-Left: Reusable Neon Lens Button */}
          <VisualLensButton
            imageUri={currentUrl}
            onBeforeNavigate={handleClose}
            onCustomSearch={onVisualSearch}
            size={40}
            iconSize={19}
            variant="neon"
          />

          {/* Center: Counter Badge or Title */}
          {images.length > 1 ? (
            <XStack
              backgroundColor="rgba(0,0,0,0.65)"
              paddingHorizontal={12}
              paddingVertical={5}
              borderRadius={tokens.radius.full}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.2)"
            >
              <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                {currentIndex + 1} / {images.length}
              </Text>
            </XStack>
          ) : title ? (
            <XStack
              maxWidth="50%"
              backgroundColor="rgba(0,0,0,0.5)"
              paddingHorizontal={12}
              paddingVertical={4}
              borderRadius={tokens.radius.md}
            >
              <Text fontSize={12} fontWeight="600" color="#FFFFFF" numberOfLines={1}>
                {title}
              </Text>
            </XStack>
          ) : (
            <YStack width={40} />
          )}

          {/* Top-Right: Share & Dismiss Actions */}
          <XStack alignItems="center" gap={8}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Share media"
              onPress={handleShare}
              activeOpacity={0.7}
              style={styles.actionButton}
            >
              <LuShare2 size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close media viewer"
              onPress={handleClose}
              activeOpacity={0.7}
              style={styles.actionButton}
            >
              <LuX size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Media FlatList / Zoomable Carousel */}
        {images.length === 1 ? (
          <YStack flex={1} justifyContent="center" alignItems="center">
            {isVideoUrl(currentUrl) ? (
              <UnifiedVideoPlayer uri={currentUrl} isActive={visible} />
            ) : (
              <ZoomableImage
                uri={currentUrl}
                containerWidth={SCREEN_WIDTH}
                containerHeight={viewerHeight}
                contentFit="contain"
                isActive={visible}
                onZoomChange={setIsZoomed}
              />
            )}
          </YStack>
        ) : (
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            initialScrollIndex={initialIndex < images.length ? initialIndex : 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentIndex(idx);
              setIsZoomed(false);
            }}
            renderItem={({ item, index }) => (
              <YStack
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                justifyContent="center"
                alignItems="center"
              >
                {isVideoUrl(item) ? (
                  <UnifiedVideoPlayer uri={item} isActive={visible && index === currentIndex} />
                ) : (
                  <ZoomableImage
                    uri={item}
                    containerWidth={SCREEN_WIDTH}
                    containerHeight={viewerHeight}
                    contentFit="contain"
                    isActive={index === currentIndex}
                    onZoomChange={(zoomed) => {
                      if (index === currentIndex) {
                        setIsZoomed(zoomed);
                      }
                    }}
                  />
                )}
              </YStack>
            )}
          />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});
