import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PanResponder, View, ScrollView, Image, Linking, Pressable, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuChevronLeft, LuChevronRight, LuInstagram, LuExternalLink, LuX, LuArrowLeft } from 'react-icons/lu';
import { CarouselDot } from '../../atoms/CarouselDot/CarouselDot';
import { SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';
import { useTheme, useResponsive } from '../../../theme';
import { FocusModeContext } from '../../templates/ProductDetailTemplate';

export type GalleryImage = {
  id: string;
  label: string;
  gradient?: [string, string];
  url?: string;
  sourcePlatform?: 'instagram' | 'catalog' | 'whatsapp';
  sourceUrl?: string;
  sourcePostId?: string;
};

export type SwatchItem = {
  label: string;
  gradient: [string, string];
  template?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  colors?: string[];
  colorCount?: 2 | 3 | 4;
  images?: GalleryImage[];
};

export type ProductGalleryProps = {
  swatches: Record<string, SwatchItem>;
  selectedColor: string;
  onSelectColor: (colorKey: string) => void;
  isMobile?: boolean;
  borderless?: boolean;
  children?: React.ReactNode;
  isFocusMode?: boolean;
  onFocusModeChange?: (inFocus: boolean) => void;
};

export function ProductGallery({
  swatches,
  selectedColor,
  onSelectColor,
  isMobile: isMobileProp,
  borderless = false,
  children,
  isFocusMode: isFocusModeProp,
  onFocusModeChange,
}: ProductGalleryProps) {
  const { tokens } = useTheme();
  const responsive = useResponsive();
  const isMobile = isMobileProp ?? responsive.isMobile;
  const isTablet = responsive.isTablet;
  const isCompact = isMobile || isTablet;

  const focusContext = React.useContext(FocusModeContext);
  const isFocusHosted = Boolean(focusContext && focusContext.setFocusOverlay);

  const activeSwatch = swatches[selectedColor] || Object.values(swatches)[0];

  // Track the active image index within the currently selected color variant's group
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  const handleOpenFocusMode = () => {
    setZoomModalOpen(true);
    onFocusModeChange?.(true);
  };

  const handleCloseFocusMode = () => {
    setZoomModalOpen(false);
    onFocusModeChange?.(false);
    if (isFocusHosted) {
      focusContext.setFocusMode(false);
      focusContext.setFocusOverlay(null);
    }
  };

  // Sync with controlled isFocusModeProp if passed
  useEffect(() => {
    if (isFocusModeProp !== undefined && isFocusModeProp !== zoomModalOpen) {
      setZoomModalOpen(isFocusModeProp);
    }
  }, [isFocusModeProp]);

  // When selected color changes, reset image index to first photo of that group
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColor]);

  // Resolve grouped images for this color tag (falls back to single swatch image if none specified)
  const activeImages: GalleryImage[] = useMemo(() => {
    if (activeSwatch?.images && activeSwatch.images.length > 0) {
      return activeSwatch.images;
    }
    return [
      {
        id: '1',
        label: `${activeSwatch?.label || 'Saree'} - Front Drape`,
        gradient: activeSwatch?.gradient || ['#f3e6d8', '#d3aa75'],
      },
    ];
  }, [activeSwatch]);

  const totalImages = activeImages.length;
  const currentImage = activeImages[activeImageIndex] || activeImages[0];

  // Circular navigation across the grouped photos
  const handleNextImage = () => {
    if (totalImages <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % totalImages);
  };

  const handlePrevImage = () => {
    if (totalImages <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  // PanResponder for touch & mouse drag swipe detection
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -30) {
            // Swiped left -> next photo circularly
            handleNextImage();
          } else if (gestureState.dx > 30) {
            // Swiped right -> previous photo circularly
            handlePrevImage();
          }
        },
      }),
    [totalImages, activeImageIndex]
  );

  // Web touch fallback
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent?.touches?.[0]?.clientX ?? e.clientX;
  };
  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return;
    const endX = e.nativeEvent?.changedTouches?.[0]?.clientX ?? e.clientX;
    const diff = touchStartX.current - endX;
    if (diff > 30) {
      handleNextImage();
    } else if (diff < -30) {
      handlePrevImage();
    }
    touchStartX.current = null;
  };

  const handleOpenInstagram = (img: GalleryImage, e?: any) => {
    e?.stopPropagation?.();
    const url =
      img.sourceUrl ||
      (img.sourcePostId ? `https://www.instagram.com/p/${img.sourcePostId}/` : 'https://www.instagram.com');
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  // Focus Modal swipe and dismiss gestures
  const modalTouchStartX = useRef<number | null>(null);
  const modalTouchStartY = useRef<number | null>(null);

  const handleModalTouchStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e;
    modalTouchStartX.current = touch.clientX ?? touch.pageX;
    modalTouchStartY.current = touch.clientY ?? touch.pageY;
  };

  const handleModalTouchEnd = (e: any) => {
    if (modalTouchStartX.current === null || modalTouchStartY.current === null) return;
    const touch = e.nativeEvent?.changedTouches?.[0] || e;
    const endX = touch.clientX ?? touch.pageX;
    const endY = touch.clientY ?? touch.pageY;
    const diffX = endX - modalTouchStartX.current;
    const diffY = endY - modalTouchStartY.current;

    // Edge back swipe (started on left quarter < 120px and swiped right > 40px)
    const isEdgeBackSwipe = modalTouchStartX.current < 120 && diffX > 40;
    // Downward swipe dismiss (drag down > 70px)
    const isDownSwipeDismiss = diffY > 70 && Math.abs(diffY) > Math.abs(diffX);
    // General back swipe when at first image
    const isFirstImageBackSwipe = activeImageIndex === 0 && diffX > 60;

    if (isEdgeBackSwipe || isDownSwipeDismiss || isFirstImageBackSwipe) {
      handleCloseFocusMode();
    } else if (diffX < -40) {
      handleNextImage();
    } else if (diffX > 40) {
      handlePrevImage();
    }

    modalTouchStartX.current = null;
    modalTouchStartY.current = null;
  };

  // PanResponder for modal drag/swipe (works for both touch and mouse drag on web)
  const modalPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15;
        },
        onPanResponderRelease: (_, gestureState) => {
          const isEdgeBackSwipe = gestureState.x0 < 120 && gestureState.dx > 40;
          const isDownSwipeDismiss = gestureState.dy > 70 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
          const isFirstImageBackSwipe = activeImageIndex === 0 && gestureState.dx > 60;

          if (isEdgeBackSwipe || isDownSwipeDismiss || isFirstImageBackSwipe) {
            handleCloseFocusMode();
          } else if (gestureState.dx < -40) {
            handleNextImage();
          } else if (gestureState.dx > 40) {
            handlePrevImage();
          }
        },
      }),
    [totalImages, activeImageIndex]
  );

  // Keyboard navigation on web for focus mode
  useEffect(() => {
    if (!zoomModalOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseFocusMode();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomModalOpen, totalImages, activeImageIndex]);

  const renderZoomModal = () => {
    if (!zoomModalOpen) return null;
    return (
      <View
        {...modalPanResponder.panHandlers}
        style={{
          position: (Platform.OS === 'web' && !isFocusHosted ? 'fixed' : 'absolute') as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          zIndex: 999999,
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
        onTouchStart={handleModalTouchStart}
        onTouchEnd={handleModalTouchEnd}
      >
        {/* Dismiss: Left navigation arrow in the very top left */}
        <Pressable
          onPress={(e: any) => {
            e?.stopPropagation?.();
            handleCloseFocusMode();
          }}
          hitSlop={16}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 48 : 16,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000002,
          } as any}
          accessibilityLabel="Back to PDP"
        >
          <LuArrowLeft size={24} color="#FFFFFF" />
        </Pressable>

        {/* Previous Chevron (Desktop / Tablet) */}
        {totalImages > 1 ? (
          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              handlePrevImage();
            }}
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: [{ translateY: -24 }],
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100001,
            } as any}
          >
            <LuChevronLeft size={28} color="#ffffff" />
          </Pressable>
        ) : null}

        {/* Focused Media: fills the entire screen down to preview tiles with 0 padding above/below */}
        <View
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000000',
            overflow: 'hidden',
          }}
        >
          {currentImage.url ? (
            <Image
              source={{ uri: currentImage.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : (
            <LinearGradient
              colors={currentImage.gradient || ['#f3e6d8', '#d3aa75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </View>

        {/* Next Chevron (Desktop / Tablet) */}
        {totalImages > 1 ? (
          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              handleNextImage();
            }}
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: [{ translateY: -24 }],
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100001,
            } as any}
          >
            <LuChevronRight size={28} color="#ffffff" />
          </Pressable>
        ) : null}

        {/* Flush Preview Tiles: docked at the very bottom edge taking full screen from top to bottom */}
        {totalImages > 1 && (
          <View
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: isMobile ? 74 : 86,
              backgroundColor: '#07090E',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.12)',
              justifyContent: 'center',
              paddingVertical: 8,
              zIndex: 1000001,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                alignItems: 'center',
                paddingHorizontal: 16,
                gap: 10,
              }}
            >
              {activeImages.map((img, idx) => {
                const isSelected = idx === activeImageIndex;
                return (
                  <Pressable
                    key={img.id || idx}
                    onPress={() => setActiveImageIndex(idx)}
                    style={{
                      width: isMobile ? 48 : 56,
                      height: isMobile ? 58 : 68,
                      borderRadius: 8,
                      borderWidth: isSelected ? 2.5 : 1,
                      borderColor: isSelected
                        ? (tokens.accent || '#D4AF37')
                        : 'rgba(255, 255, 255, 0.2)',
                      overflow: 'hidden',
                      opacity: isSelected ? 1 : 0.6,
                      cursor: 'pointer',
                    } as any}
                  >
                    {img.url ? (
                      <Image
                        source={{ uri: img.url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={img.gradient || ['#f3e6d8', '#d3aa75']}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Synchronize focus overlay with parent FocusModeContext when hosted
  useEffect(() => {
    if (isFocusHosted) {
      if (zoomModalOpen) {
        focusContext.setFocusMode(true);
        focusContext.setFocusOverlay(renderZoomModal());
      } else {
        focusContext.setFocusMode(false);
        focusContext.setFocusOverlay(null);
      }
    }
  }, [
    isFocusHosted,
    zoomModalOpen,
    activeImageIndex,
    totalImages,
    currentImage,
    isMobile,
    activeImages,
    tokens.accent,
  ]);

  useEffect(() => {
    return () => {
      if (isFocusHosted) {
        focusContext.setFocusMode(false);
        focusContext.setFocusOverlay(null);
      }
    };
  }, [isFocusHosted]);

  // -------------------------------------------------------------
  // MOBILE & TABLET VIEW: Carousel with Circular Swipe + Children Slot Below
  // -------------------------------------------------------------
  if (isCompact) {
    const carouselHeight = isMobile ? 390 : 460;

    return (
      <YStack width="100%" gap={14}>
        <View
          {...panResponder.panHandlers}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ width: '100%' }}
        >
          <YStack
            width="100%"
            height={carouselHeight}
            borderRadius={20}
            overflow="hidden"
            borderWidth={1}
            borderColor={tokens.border}
            position="relative"
          >
            <Pressable
              onPress={handleOpenFocusMode}
              style={{ width: '100%', height: '100%', cursor: 'zoom-in' } as any}
            >
              {currentImage.url ? (
                <Image
                  source={{ uri: currentImage.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={currentImage.gradient || ['#f3e6d8', '#d3aa75']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </Pressable>

            {/* Instagram Source Badge & Link-out */}
            {currentImage.sourcePlatform === 'instagram' ? (
              <XStack
                position="absolute"
                top={12}
                right={12}
                backgroundColor="rgba(0, 0, 0, 0.65)"
                borderRadius={20}
                paddingHorizontal={10}
                paddingVertical={5}
                gap={6}
                alignItems="center"
                cursor="pointer"
                zIndex={15}
                hoverStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', scale: 1.03 }}
                pressStyle={{ scale: 0.95 }}
                onPress={(e) => handleOpenInstagram(currentImage, e)}
              >
                <LuInstagram size={14} color="#E1306C" />
                <Text color="#FFFFFF" fontSize={11} fontWeight="600">
                  Seen on Instagram
                </Text>
                <LuExternalLink size={11} color="rgba(255,255,255,0.7)" />
              </XStack>
            ) : null}

            {/* Left Chevron Button (Circular Prev Image) */}
            {totalImages > 1 ? (
              <XStack
                position="absolute"
                left={10}
                top="50%"
                marginTop={-18}
                width={36}
                height={36}
                borderRadius={9999}
                backgroundColor="rgba(0,0,0,0.3)"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={handlePrevImage}
                hoverStyle={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                pressStyle={{ scale: 0.92 }}
                zIndex={10}
              >
                <LuChevronLeft size={20} color="#ffffff" />
              </XStack>
            ) : null}

            {/* Right Chevron Button (Circular Next Image) */}
            {totalImages > 1 ? (
              <XStack
                position="absolute"
                right={10}
                top="50%"
                marginTop={-18}
                width={36}
                height={36}
                borderRadius={9999}
                backgroundColor="rgba(0,0,0,0.3)"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={handleNextImage}
                hoverStyle={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                pressStyle={{ scale: 0.92 }}
                zIndex={10}
              >
                <LuChevronRight size={20} color="#ffffff" />
              </XStack>
            ) : null}

            {/* Horizontal Thumbnail Preview Strip (Edge to edge, no glass container, horizontally scrollable) */}
            {totalImages > 1 ? (
              <XStack
                position="absolute"
                bottom={10}
                left={0}
                right={0}
                width="100%"
                alignItems="center"
                zIndex={20}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, alignItems: 'center', paddingHorizontal: 12 }}
                  style={{ width: '100%' }}
                >
                  {activeImages.map((img, idx) => {
                    const isSelected = activeImageIndex === idx;
                    return (
                      <XStack
                        key={img.id || idx}
                        width={isMobile ? 44 : 50}
                        height={isMobile ? 44 : 50}
                        borderRadius={10}
                        borderWidth={isSelected ? 2.5 : 1.5}
                        borderColor={isSelected ? tokens.accent : '#FFFFFF'}
                        overflow="hidden"
                        cursor="pointer"
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          setActiveImageIndex(idx);
                        }}
                        hoverStyle={{ scale: 1.08 }}
                        pressStyle={{ scale: 0.95 }}
                        backgroundColor="#1E293B"
                        style={{
                          shadowColor: '#000000',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.45,
                          shadowRadius: 6,
                          elevation: 6,
                        } as any}
                      >
                        {img.url ? (
                          <Image
                            source={{ uri: img.url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={img.gradient || ['#f3e6d8', '#d3aa75']}
                            style={{ width: '100%', height: '100%' }}
                          />
                        )}

                        {img.sourcePlatform === 'instagram' ? (
                          <XStack
                            position="absolute"
                            bottom={2}
                            right={2}
                            width={14}
                            height={14}
                            borderRadius={7}
                            backgroundColor="rgba(0,0,0,0.75)"
                            alignItems="center"
                            justifyContent="center"
                            zIndex={5}
                          >
                            <LuInstagram size={9} color="#E1306C" />
                          </XStack>
                        ) : null}
                      </XStack>
                    );
                  })}
                </ScrollView>
              </XStack>
            ) : null}
          </YStack>
        </View>

        {/* COMPACT VIEW (Mobile & Tablet): Swatches Row with 100% full width */}
        {children ? (
          <YStack
            backgroundColor={borderless ? 'transparent' : tokens.surface}
            borderColor={borderless ? 'transparent' : tokens.border}
            borderWidth={borderless ? 0 : 1}
            borderRadius={borderless ? 0 : 16}
            padding={borderless ? 4 : (isMobile ? 12 : 16)}
            gap={10}
            width="100%"
          >
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<any>, {
                  mediaSlot: undefined,
                  swatchesAlign: 'left',
                })
              : children}
          </YStack>
        ) : null}

        {!isFocusHosted ? renderZoomModal() : null}
      </YStack>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP VIEW: Side Thumbnails of the Active Color's Photo Group + Large Hero Canvas
  // -------------------------------------------------------------
  return (
    <XStack flex={1.1} width="100%" gap={16} minHeight={580} alignItems="flex-start">
      {/* Side Thumbnails of Grouped Images */}
      <YStack width={84} gap={10} flexShrink={0}>
        {activeImages.map((img, idx) => {
          const isSelected = activeImageIndex === idx;
          return (
            <XStack
              key={img.id || idx}
              height={92}
              borderRadius={12}
              borderWidth={isSelected ? 2.5 : 1}
              borderColor={isSelected ? tokens.accent : tokens.border}
              overflow="hidden"
              cursor="pointer"
              onPress={() => setActiveImageIndex(idx)}
              hoverStyle={{ scale: 1.04, borderColor: tokens.accent }}
            >
              {img.url ? (
                <Image
                  source={{ uri: img.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={img.gradient || ['#f3e6d8', '#d3aa75']}
                  style={{ width: '100%', height: '100%' }}
                />
              )}

              {img.sourcePlatform === 'instagram' ? (
                <XStack
                  position="absolute"
                  bottom={4}
                  right={4}
                  paddingHorizontal={4}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor="rgba(0,0,0,0.75)"
                  alignItems="center"
                  gap={3}
                  zIndex={5}
                >
                  <LuInstagram size={10} color="#E1306C" />
                  <Text color="#FFFFFF" fontSize={9} fontWeight="700">IG</Text>
                </XStack>
              ) : null}
            </XStack>
          );
        })}
      </YStack>

      {/* Hero Canvas displaying Active Image */}
      <YStack
        flex={1}
        minHeight={580}
        borderRadius={20}
        overflow="hidden"
        borderWidth={1}
        borderColor={tokens.border}
        position="relative"
      >
        <Pressable
          onPress={handleOpenFocusMode}
          style={{ width: '100%', height: '100%', minHeight: 580, cursor: 'zoom-in' } as any}
        >
          {currentImage.url ? (
            <Image
              source={{ uri: currentImage.url }}
              style={{ width: '100%', height: '100%', minHeight: 580 }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={currentImage.gradient || ['#f3e6d8', '#d3aa75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', minHeight: 580 }}
            />
          )}
        </Pressable>

        {/* Instagram Source Badge & Link-out */}
        {currentImage.sourcePlatform === 'instagram' ? (
          <XStack
            position="absolute"
            top={16}
            right={16}
            backgroundColor="rgba(0, 0, 0, 0.65)"
            borderRadius={20}
            paddingHorizontal={12}
            paddingVertical={6}
            gap={8}
            alignItems="center"
            cursor="pointer"
            zIndex={15}
            hoverStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', scale: 1.03 }}
            pressStyle={{ scale: 0.95 }}
            onPress={(e) => handleOpenInstagram(currentImage, e)}
          >
            <LuInstagram size={16} color="#E1306C" />
            <Text color="#FFFFFF" fontSize={12} fontWeight="600">
              Seen on Instagram
            </Text>
            <LuExternalLink size={12} color="rgba(255,255,255,0.7)" />
          </XStack>
        ) : null}

        {/* Desktop Left / Right Navigation Chevrons */}
        {totalImages > 1 ? (
          <>
            <XStack
              position="absolute"
              left={16}
              top="50%"
              marginTop={-22}
              width={44}
              height={44}
              borderRadius={9999}
              backgroundColor="rgba(0,0,0,0.3)"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handlePrevImage}
              hoverStyle={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <LuChevronLeft size={24} color="#ffffff" />
            </XStack>

            <XStack
              position="absolute"
              right={16}
              top="50%"
              marginTop={-22}
              width={44}
              height={44}
              borderRadius={9999}
              backgroundColor="rgba(0,0,0,0.3)"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handleNextImage}
              hoverStyle={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <LuChevronRight size={24} color="#ffffff" />
            </XStack>
          </>
        ) : null}

        {/* Photo Label Counter Badge */}
        <XStack
          position="absolute"
          bottom={18}
          right={18}
          backgroundColor="rgba(0,0,0,0.5)"
          paddingHorizontal={14}
          paddingVertical={6}
          borderRadius={9999}
          maxWidth="75%"
        >
          <Text fontSize={12} fontWeight="800" color="#ffffff" numberOfLines={1}>
            {activeImageIndex + 1} / {totalImages} • {currentImage.label}
          </Text>
        </XStack>
      </YStack>

      {!isFocusHosted ? renderZoomModal() : null}
    </XStack>
  );
}
