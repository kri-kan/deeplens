import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PanResponder, View, ScrollView, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { CarouselDot } from '../../atoms/CarouselDot/CarouselDot';
import { SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';
import { useTheme, useResponsive } from '../../../theme';

export type GalleryImage = {
  id: string;
  label: string;
  gradient?: [string, string];
  url?: string;
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
  children?: React.ReactNode;
};

export function ProductGallery({
  swatches,
  selectedColor,
  onSelectColor,
  isMobile: isMobileProp,
  children,
}: ProductGalleryProps) {
  const { tokens } = useTheme();
  const responsive = useResponsive();
  const isMobile = isMobileProp ?? responsive.isMobile;
  const isTablet = responsive.isTablet;
  const isCompact = isMobile || isTablet;

  const activeSwatch = swatches[selectedColor] || Object.values(swatches)[0];

  // Track the active image index within the currently selected color variant's group
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
            cursor="grab"
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
              >
                <LuChevronRight size={20} color="#ffffff" />
              </XStack>
            ) : null}

            {/* Centered Pill/Dot Carousel Indicator for the Active Group's Photos */}
            {totalImages > 1 ? (
              <XStack
                position="absolute"
                bottom={14}
                left={0}
                right={0}
                justifyContent="center"
                alignItems="center"
                gap={6}
              >
                {activeImages.map((img, idx) => (
                  <CarouselDot
                    key={img.id || idx}
                    active={activeImageIndex === idx}
                    onPress={() => setActiveImageIndex(idx)}
                  />
                ))}
              </XStack>
            ) : null}
          </YStack>
        </View>

        {/* COMPACT VIEW (Mobile & Tablet): Row 1 = Color Title spanning left to right; Row 2 = Media Tiles (Left) + Swatches (Right-most) */}
        {children ? (
          <YStack
            backgroundColor={tokens.surface}
            borderColor={tokens.border}
            borderWidth={1}
            borderRadius={16}
            padding={isMobile ? 12 : 16}
            gap={10}
            width="100%"
          >
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<any>, {
                  mediaSlot: activeImages.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0, maxWidth: isMobile ? '55%' : '65%' }}
                      contentContainerStyle={{ gap: 6, alignItems: 'center', paddingVertical: 2 }}
                    >
                      {activeImages.map((img, idx) => {
                        const isSelected = activeImageIndex === idx;
                        return (
                          <XStack
                            key={img.id || idx}
                            width={isMobile ? 38 : 46}
                            height={isMobile ? 38 : 46}
                            borderRadius={8}
                            borderWidth={isSelected ? 2 : 1}
                            borderColor={isSelected ? tokens.accent : tokens.border}
                            overflow="hidden"
                            cursor="pointer"
                            onPress={() => setActiveImageIndex(idx)}
                            hoverStyle={{ scale: 1.05, borderColor: tokens.accent }}
                            pressStyle={{ scale: 0.95 }}
                            backgroundColor={tokens.surfaceRaised}
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
                          </XStack>
                        );
                      })}
                    </ScrollView>
                  ) : undefined,
                  swatchesAlign: 'right',
                })
              : children}
          </YStack>
        ) : null}
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
    </XStack>
  );
}
