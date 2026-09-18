import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ScrollView,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  RotateCcw,
} from 'lucide-react-native';
import { VideoPlayer } from './VideoPlayer';

export interface FullscreenMediaItem {
  id?: string;
  url: string;
  mediaType?: number | 'image' | 'video';
  title?: string;
  thumbnailUrl?: string;
}

export interface FullscreenMediaViewerProps {
  visible: boolean;
  onClose: () => void;
  media: (string | FullscreenMediaItem)[];
  initialIndex?: number;
  productTitle?: string;
  productCode?: string;
}

export const isVideoMedia = (item: FullscreenMediaItem): boolean => {
  if (item.mediaType === 2 || item.mediaType === 'video') return true;
  if (!item.url) return false;
  return /\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(item.url);
};

export const FullscreenMediaViewer: React.FC<FullscreenMediaViewerProps> = ({
  visible,
  onClose,
  media,
  initialIndex = 0,
  productTitle,
  productCode,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Normalize input media items to uniform FullscreenMediaItem shape
  const normalizedMedia: FullscreenMediaItem[] = useMemo(() => {
    if (!media || media.length === 0) return [];
    return media.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `media-${idx}`,
          url: item,
          mediaType: /\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(item) ? 2 : 1,
        };
      }
      return {
        ...item,
        id: item.id || `media-${idx}`,
        mediaType: item.mediaType ?? (/\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(item.url) ? 2 : 1),
      };
    });
  }, [media]);

  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, normalizedMedia.length - 1))
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasErrorMap, setHasErrorMap] = useState<Record<number, boolean>>({});
  const [showControls, setShowControls] = useState(true);

  const flatListRef = useRef<FlatList<FullscreenMediaItem>>(null);
  const scrollTimeoutsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initialIndex when modal opens
  useEffect(() => {
    if (visible) {
      const target = Math.min(
        Math.max(0, initialIndex),
        Math.max(0, normalizedMedia.length - 1)
      );
      setActiveIndex(target);
      setIsZoomed(false);
      setHasErrorMap({});

      // Scroll to initial index once layout is ready
      scrollTimeoutsRef.current = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: target,
          animated: false,
        });
      }, 50);
    }
    return () => {
      if (scrollTimeoutsRef.current) clearTimeout(scrollTimeoutsRef.current);
    };
  }, [visible, initialIndex, normalizedMedia.length]);

  // Reset zoom when navigating slides
  const handleSlideChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);
    setIsZoomed(false);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / windowWidth);
      if (index >= 0 && index < normalizedMedia.length && index !== activeIndex) {
        handleSlideChange(index);
      }
    },
    [windowWidth, normalizedMedia.length, activeIndex, handleSlideChange]
  );

  const navigateTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= normalizedMedia.length) return;
      handleSlideChange(index);
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    },
    [normalizedMedia.length, handleSlideChange]
  );

  const handlePrev = useCallback(() => {
    navigateTo(activeIndex - 1);
  }, [activeIndex, navigateTo]);

  const handleNext = useCallback(() => {
    navigateTo(activeIndex + 1);
  }, [activeIndex, navigateTo]);

  // Keyboard navigation on web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose, handlePrev, handleNext]);

  const currentItem = normalizedMedia[activeIndex] || null;
  const isCurrentVideo = currentItem ? isVideoMedia(currentItem) : false;

  const toggleZoom = () => {
    if (isCurrentVideo) return;
    setIsZoomed((prev) => !prev);
  };

  const handleImageError = (index: number) => {
    setHasErrorMap((prev) => ({ ...prev, [index]: true }));
  };

  // Render each slide item
  const renderItem = ({
    item,
    index,
  }: {
    item: FullscreenMediaItem;
    index: number;
  }) => {
    const isVideo = isVideoMedia(item);
    const hasError = hasErrorMap[index];

    return (
      <View
        style={[
          styles.slideContainer,
          { width: windowWidth, height: windowHeight },
        ]}
      >
        {isVideo ? (
          <VideoPlayer
            url={item.url}
            posterUrl={item.thumbnailUrl}
            autoPlay={visible && index === activeIndex}
            style={styles.mediaElement}
          />
        ) : (
          <ScrollView
            style={styles.zoomScrollView}
            contentContainerStyle={styles.zoomScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            scrollEnabled={isZoomed || Platform.OS !== 'web'}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowControls((prev) => !prev)}
              onLongPress={toggleZoom}
              style={[
                styles.imageTouchWrapper,
                isZoomed && styles.imageTouchWrapperZoomed,
              ]}
            >
              {hasError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>Image Unavailable</Text>
                  <Text style={styles.errorSub}>
                    Unable to load preview asset
                  </Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() =>
                      setHasErrorMap((prev) => ({ ...prev, [index]: false }))
                    }
                  >
                    <RotateCcw size={14} color="#D4AF37" />
                    <Text style={styles.retryText}>Reload</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Image
                  source={{ uri: item.url }}
                  style={[
                    styles.mediaElement,
                    {
                      width: windowWidth,
                      height: windowHeight,
                      transform: [{ scale: isZoomed ? 2.5 : 1 }],
                    },
                  ]}
                  resizeMode="contain"
                  onError={() => handleImageError(index)}
                />
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  };

  if (!visible || normalizedMedia.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.rootContainer}>
        {/* Main Edge-to-Edge Swiping Gallery */}
        <FlatList
          ref={flatListRef}
          data={normalizedMedia}
          keyExtractor={(item, index) => item.id || `fullscreen-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          style={styles.flatList}
        />

        {/* Top Header Overlay Bar */}
        {showControls && (
          <View style={styles.topHeaderBar}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityLabel="Close media viewer"
            >
              <X size={20} color="#FAF7F2" />
            </TouchableOpacity>

            {/* Product Title / Code Pill */}
            {(productCode || productTitle) && (
              <View style={styles.productPill}>
                {productCode && (
                  <Text style={styles.productCodeText}>{productCode}</Text>
                )}
                {productCode && productTitle && (
                  <Text style={styles.productPillDivider}>·</Text>
                )}
                {productTitle && (
                  <Text style={styles.productTitleText} numberOfLines={1}>
                    {productTitle}
                  </Text>
                )}
              </View>
            )}

            {/* Right Action Group: Zoom Toggle & Counter Pill */}
            <View style={styles.topRightGroup}>
              {!isCurrentVideo && (
                <TouchableOpacity
                  style={[
                    styles.iconCircleBtn,
                    isZoomed && styles.iconCircleBtnActive,
                  ]}
                  onPress={toggleZoom}
                  activeOpacity={0.8}
                  accessibilityLabel="Toggle zoom"
                >
                  {isZoomed ? (
                    <ZoomOut size={18} color="#D4AF37" />
                  ) : (
                    <ZoomIn size={18} color="#FAF7F2" />
                  )}
                </TouchableOpacity>
              )}

              {/* Overlay Counter Badge */}
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {activeIndex + 1} / {normalizedMedia.length}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Left Desktop Chevron */}
        {isDesktop && activeIndex > 0 && showControls && (
          <TouchableOpacity
            style={[styles.desktopNavBtn, styles.desktopNavBtnLeft]}
            onPress={handlePrev}
            activeOpacity={0.85}
            accessibilityLabel="Previous media"
          >
            <ChevronLeft size={28} color="#FAF7F2" />
          </TouchableOpacity>
        )}

        {/* Right Desktop Chevron */}
        {isDesktop && activeIndex < normalizedMedia.length - 1 && showControls && (
          <TouchableOpacity
            style={[styles.desktopNavBtn, styles.desktopNavBtnRight]}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityLabel="Next media"
          >
            <ChevronRight size={28} color="#FAF7F2" />
          </TouchableOpacity>
        )}

        {/* Bottom Thumbnail Strip Overlay (when > 1 item) */}
        {normalizedMedia.length > 1 && showControls && (
          <View style={styles.bottomBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailStripContent}
            >
              {normalizedMedia.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isVideo = isVideoMedia(item);
                return (
                  <TouchableOpacity
                    key={item.id || `thumb-${idx}`}
                    onPress={() => navigateTo(idx)}
                    activeOpacity={0.8}
                    style={[
                      styles.thumbItem,
                      isActive && styles.thumbItemActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl || item.url }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                    {isVideo && (
                      <View style={styles.thumbVideoBadge}>
                        <Play size={10} color="#FAF7F2" fill="#FAF7F2" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  zoomScrollView: {
    width: '100%',
    height: '100%',
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchWrapperZoomed: {
    cursor: Platform.OS === 'web' ? 'zoom-out' : undefined,
  } as any,
  mediaElement: {
    width: '100%',
    height: '100%',
  },
  topHeaderBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 20, 25, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  iconCircleBtnActive: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(26, 54, 93, 0.85)',
  },
  productPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 25, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: '50%',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  productCodeText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productPillDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
    fontSize: 12,
  },
  productTitleText: {
    color: '#FAF7F2',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBadge: {
    backgroundColor: 'rgba(20, 20, 25, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  counterText: {
    color: '#FAF7F2',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desktopNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(20, 20, 25, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
      },
    }),
  },
  desktopNavBtnLeft: {
    left: 24,
  },
  desktopNavBtnRight: {
    right: 24,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  thumbnailStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 15, 20, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  thumbItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    opacity: 0.6,
  },
  thumbItemActive: {
    borderColor: '#D4AF37',
    borderWidth: 2,
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbVideoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(26, 54, 93, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorTitle: {
    color: '#FAF7F2',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSub: {
    color: '#A0AEC0',
    fontSize: 13,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '600',
  },
});
