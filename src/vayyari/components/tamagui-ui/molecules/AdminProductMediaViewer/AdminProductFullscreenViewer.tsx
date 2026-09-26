import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { YStack, XStack, Text } from 'tamagui';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LuX, LuDownload, LuStar, LuPlay, LuImage } from '../../icons/lu';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { MediaSlideItem } from '../AdminProductMediaCarousel';
import { useTheme } from '@/theme';
import { getIndicatorType } from '@/utils/zoomMath';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const THUMBNAIL_WIDTH = 48;
const THUMBNAIL_HEIGHT = 62;
const THUMBNAIL_GAP = 8;

export interface AdminProductFullscreenViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaList: MediaSlideItem[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  onDownloadMedia?: (media: MediaSlideItem) => void;
  onStarMedia?: (mediaId: string) => void;
  topInset?: number;
  bottomInset?: number;
}

const FullscreenVideoItem = ({ uri, isActive }: { uri: string; isActive: boolean }) => {
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
    <YStack width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.72} alignItems="center" justifyContent="center">
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="contain"
        nativeControls
      />
    </YStack>
  );
};

export function AdminProductFullscreenViewer({
  visible,
  onClose,
  mediaList = [],
  initialIndex = 0,
  onIndexChange,
  onDownloadMedia,
  onStarMedia,
  topInset = 0,
  bottomInset = 0,
}: AdminProductFullscreenViewerProps) {
  const { tokens } = useTheme();
  const [activeMediaIndex, setActiveMediaIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const carouselRef = useRef<FlatList<MediaSlideItem>>(null);
  const thumbnailListRef = useRef<FlatList<MediaSlideItem>>(null);

  // Android hardware back press listener
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [visible, onClose]);

  // Sync internal state when opened or initialIndex changes
  useEffect(() => {
    if (visible && mediaList.length > 0) {
      const targetIndex = Math.min(Math.max(0, initialIndex), Math.max(0, mediaList.length - 1));
      setActiveMediaIndex(targetIndex);
      setIsZoomed(false);
      setTimeout(() => {
        try {
          carouselRef.current?.scrollToIndex({ index: targetIndex, animated: false });
          thumbnailListRef.current?.scrollToIndex({
            index: targetIndex,
            viewPosition: 0.5,
            animated: false,
          });
        } catch {
          // Layout timing safe fallback
        }
      }, 50);
    }
  }, [visible, initialIndex, mediaList.length]);

  // Handle jump to nth image when thumbnail tapped
  const handleThumbnailPress = useCallback(
    (index: number) => {
      if (index >= 0 && index < mediaList.length) {
        setActiveMediaIndex(index);
        setIsZoomed(false);
        onIndexChange?.(index);
        try {
          carouselRef.current?.scrollToIndex({ index, animated: true });
          thumbnailListRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
        } catch {
          // Fallback
        }
      }
    },
    [mediaList.length, onIndexChange]
  );

  // Main carousel momentum scroll end
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / (SCREEN_WIDTH || 1));
      if (newIndex >= 0 && newIndex < mediaList.length && newIndex !== activeMediaIndex) {
        setActiveMediaIndex(newIndex);
        setIsZoomed(false);
        onIndexChange?.(newIndex);
        try {
          thumbnailListRef.current?.scrollToIndex({
            index: newIndex,
            viewPosition: 0.5,
            animated: true,
          });
        } catch {
          // Safe fallback
        }
      }
    },
    [mediaList.length, activeMediaIndex, onIndexChange]
  );

  const currentMedia = mediaList[activeMediaIndex];
  const viewerHeight = SCREEN_HEIGHT * 0.72;
  const indicatorType = getIndicatorType(mediaList.length);

  if (!visible || mediaList.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <GestureHandlerRootView style={styles.rootContainer}>
        {/* Top Header Bar */}
        <XStack
          position="absolute"
          top={topInset + 8}
          left={0}
          right={0}
          paddingHorizontal={16}
          alignItems="center"
          justifyContent="space-between"
          zIndex={30}
        >
          {/* Close Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen preview"
            activeOpacity={0.7}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <XStack
              width={38}
              height={38}
              borderRadius={19}
              backgroundColor="rgba(255,255,255,0.2)"
              alignItems="center"
              justifyContent="center"
            >
              <LuX size={20} color="#ffffff" />
            </XStack>
          </TouchableOpacity>

          {/* n / m Index Counter Pill */}
          <XStack
            backgroundColor="rgba(0,0,0,0.65)"
            paddingHorizontal={14}
            paddingVertical={6}
            borderRadius={tokens.radius.full}
            alignItems="center"
            gap={6}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.2)"
          >
            <LuImage size={13} color="#ffffff" />
            <Text fontSize={13} fontWeight="800" color="#ffffff">
              {activeMediaIndex + 1} / {mediaList.length}
            </Text>
          </XStack>

          {/* Placeholder spacer for balanced header */}
          <YStack width={38} height={38} />
        </XStack>

        {/* Center Main Carousel with Pan & Zoom */}
        <YStack flex={1} justifyContent="center" alignItems="center">
          <FlatList
            ref={carouselRef}
            data={mediaList}
            horizontal
            pagingEnabled
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(m, idx) => (m.id && m.id !== '00000000-0000-0000-0000-000000000000' ? `${m.id}-${idx}` : String(idx))}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                carouselRef.current?.scrollToIndex({ index: info.index, animated: false });
              }, 50);
            }}
            style={{ width: SCREEN_WIDTH, height: viewerHeight }}
            renderItem={({ item: m, index: idx }) => (
              <YStack
                width={SCREEN_WIDTH}
                height={viewerHeight}
                justifyContent="center"
                alignItems="center"
                position="relative"
              >
                {m.mediaType === 'video' ? (
                  <FullscreenVideoItem uri={m.url} isActive={visible && idx === activeMediaIndex} />
                ) : (
                  <ZoomableImage
                    key={`zoomable-${m.id}-${idx}`}
                    uri={m.url || m.thumbnailUrl || ''}
                    containerWidth={SCREEN_WIDTH}
                    containerHeight={viewerHeight}
                    contentFit="contain"
                    isActive={idx === activeMediaIndex}
                    onZoomChange={(zoomed) => {
                      if (idx === activeMediaIndex) {
                        setIsZoomed(zoomed);
                      }
                    }}
                  />
                )}
              </YStack>
            )}
          />
        </YStack>

        {/* Carousel Pagination Dots / Adaptive Indicator Bar */}
        {mediaList.length > 1 && (
          <YStack
            position="absolute"
            bottom={Math.max(14, bottomInset + 8) + 128}
            alignSelf="center"
            zIndex={25}
          >
            {indicatorType === 'dots' ? (
              <XStack
                backgroundColor="rgba(0,0,0,0.6)"
                paddingHorizontal={10}
                paddingVertical={5}
                borderRadius={tokens.radius.full}
                gap={5}
                alignItems="center"
              >
                {mediaList.map((_, i) => {
                  const isActive = i === activeMediaIndex;
                  return (
                    <YStack
                      key={i}
                      width={isActive ? 16 : 5}
                      height={5}
                      borderRadius={2.5}
                      backgroundColor={isActive ? '#ffffff' : 'rgba(255,255,255,0.35)'}
                    />
                  );
                })}
              </XStack>
            ) : (
              <XStack
                backgroundColor="rgba(0,0,0,0.65)"
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.15)"
              >
                <Text fontSize={11} fontWeight="700" color="#ffffff">
                  {activeMediaIndex + 1} of {mediaList.length}
                </Text>
              </XStack>
            )}
          </YStack>
        )}

        {/* Horizontal Small Thumbnail Scroll Strip */}
        {mediaList.length > 1 && (
          <YStack
            position="absolute"
            bottom={Math.max(14, bottomInset + 8) + 54}
            left={0}
            right={0}
            height={THUMBNAIL_HEIGHT + 4}
            zIndex={25}
          >
            <FlatList
              ref={thumbnailListRef}
              data={mediaList}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(m, idx) => `thumb-${m.id || idx}`}
              getItemLayout={(_, index) => ({
                length: THUMBNAIL_WIDTH + THUMBNAIL_GAP,
                offset: (THUMBNAIL_WIDTH + THUMBNAIL_GAP) * index,
                index,
              })}
              contentContainerStyle={styles.thumbnailListContent}
              renderItem={({ item: m, index: idx }) => {
                const isActive = idx === activeMediaIndex;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to media ${idx + 1}`}
                    activeOpacity={0.8}
                    onPress={() => handleThumbnailPress(idx)}
                    style={[
                      styles.thumbnailWrapper,
                      isActive && {
                        borderColor: tokens.accent || '#ffffff',
                        borderWidth: 2,
                        opacity: 1,
                        transform: [{ scale: 1.06 }],
                      },
                      !isActive && {
                        borderColor: 'rgba(255,255,255,0.2)',
                        borderWidth: 1,
                        opacity: 0.5,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: m.thumbnailUrl || m.url }}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                      transition={150}
                    />
                    {m.mediaType === 'video' && (
                      <YStack
                        position="absolute"
                        bottom={2}
                        left={2}
                        backgroundColor="rgba(0,0,0,0.7)"
                        borderRadius={2}
                        padding={1.5}
                      >
                        <LuPlay size={8} color="#ffffff" />
                      </YStack>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </YStack>
        )}

        {/* Floating Bottom Action Pill (Download, Set Cover) */}
        <XStack
          position="absolute"
          bottom={Math.max(14, bottomInset + 8)}
          alignSelf="center"
          gap={16}
          backgroundColor="rgba(30,30,30,0.85)"
          paddingHorizontal={20}
          paddingVertical={11}
          borderRadius={tokens.radius.full}
          borderWidth={1}
          borderColor="rgba(255,255,255,0.2)"
          zIndex={30}
        >
          {onDownloadMedia && currentMedia && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Download image"
              activeOpacity={0.7}
              onPress={() => onDownloadMedia(currentMedia)}
            >
              <XStack alignItems="center" gap={7}>
                <LuDownload size={16} color="#ffffff" />
                <Text fontSize={13} fontWeight="700" color="#ffffff">
                  Download
                </Text>
              </XStack>
            </TouchableOpacity>
          )}

          {onStarMedia && currentMedia && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Set as cover image"
              activeOpacity={0.7}
              onPress={() => onStarMedia(currentMedia.id)}
            >
              <XStack alignItems="center" gap={7}>
                <LuStar
                  size={16}
                  color={currentMedia.isDefault ? '#FFD700' : '#ffffff'}
                  style={{ fill: currentMedia.isDefault ? '#FFD700' : 'transparent' }}
                />
                <Text fontSize={13} fontWeight="700" color="#ffffff">
                  {currentMedia.isDefault ? 'Cover Photo' : 'Set Cover'}
                </Text>
              </XStack>
            </TouchableOpacity>
          )}
        </XStack>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  thumbnailListContent: {
    paddingHorizontal: 16,
    gap: THUMBNAIL_GAP,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
