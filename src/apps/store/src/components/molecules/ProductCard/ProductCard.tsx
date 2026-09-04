import React, { useState, useMemo, useRef } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuChevronLeft, LuChevronRight, LuEye, LuStar } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { PriceTag } from '../../atoms/PriceTag/PriceTag';
import { HeartButton } from '../../atoms/HeartButton/HeartButton';
import { CustomSwatchDot, SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

export type ProductCardImage = {
  id: string;
  label?: string;
  gradient: [string, string];
};

export type ProductCardProps = {
  id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  gradient?: [string, string];
  images?: ProductCardImage[];
  swatches?: Array<{
    id: string;
    label: string;
    template: SwatchTemplateType;
    primaryColor: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    colorCount?: 2 | 3 | 4;
  }>;
  showArrows?: boolean;
  size?: 'mobile' | 'tablet' | 'desktop' | 'auto';
  onPress?: () => void;
  onLongPress?: () => void;
  onQuickPreview?: () => void;
  onWishlistPress?: () => void;
  isWishlisted?: boolean;
};

export function ProductCard({
  name,
  price,
  originalPrice,
  rating,
  gradient = ['#edd9c5', '#d2a77a'],
  images,
  swatches,
  showArrows,
  size = 'auto',
  onPress,
  onLongPress,
  onQuickPreview,
  onWishlistPress,
  isWishlisted = false,
}: ProductCardProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();

  // Multi-image carousel state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Determine effective device size
  const effectiveSize = size && size !== 'auto'
    ? size
    : isMobile
    ? 'mobile'
    : isTablet
    ? 'tablet'
    : 'desktop';

  // Responsive defaults: arrows enabled on desktop, disabled by default on mobile/tablet (swipeable)
  const effectiveShowArrows = showArrows !== undefined
    ? showArrows
    : effectiveSize === 'desktop';

  // Sizing tokens based on effectiveSize
  const isCompactSize = effectiveSize === 'mobile';
  const isMidSize = effectiveSize === 'tablet';

  const imageHeight = isCompactSize ? 180 : isMidSize ? 210 : 230;
  const cardPadding = isCompactSize ? 10 : isMidSize ? 12 : 14;
  const titleFontSize = isCompactSize ? 13 : isMidSize ? 14 : 15;
  const titleLineHeight = isCompactSize ? 18 : isMidSize ? 19 : 20;
  const titleContainerHeight = isCompactSize ? 36 : isMidSize ? 38 : 42;
  const heartButtonSize = isCompactSize ? 28 : isMidSize ? 32 : 34;
  const priceTagSize: 'sm' | 'md' = isCompactSize ? 'sm' : 'md';

  // If images array is provided, use it. Otherwise derive 4 distinct views from gradient
  const cardImages = useMemo<ProductCardImage[]>(() => {
    if (images && images.length > 0) return images;
    const [c1, c2] = gradient;
    return [
      { id: '1', label: 'Front Drape', gradient: [c1, c2] },
      { id: '2', label: 'Pallu & Zari', gradient: [c2, c1] },
      { id: '3', label: 'Weave Detail', gradient: [c1, '#ffffff'] },
      { id: '4', label: 'Silhouette', gradient: ['#fbf8f3', c2] },
    ];
  }, [images, gradient]);

  const currentImage = cardImages[activeImageIndex] || cardImages[0];

  const handlePrevImage = (e?: any) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + cardImages.length) % cardImages.length);
  };

  const handleNextImage = (e?: any) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % cardImages.length);
  };

  // Natural Touch / Pointer horizontal swipe support (especially when arrows are disabled)
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: any) => {
    const clientX = e.nativeEvent?.touches?.[0]?.clientX ?? e.nativeEvent?.clientX;
    if (clientX !== undefined) {
      touchStartX.current = clientX;
    }
  };

  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return;
    const clientX = e.nativeEvent?.changedTouches?.[0]?.clientX ?? e.nativeEvent?.clientX;
    if (clientX !== undefined) {
      const diff = clientX - touchStartX.current;
      if (diff > 35) {
        // Swiped right -> go to previous image
        handlePrevImage();
      } else if (diff < -35) {
        // Swiped left -> go to next image
        handleNextImage();
      }
    }
    touchStartX.current = null;
  };

  const handleTriggerQuickPreview = (e?: any) => {
    e?.stopPropagation();
    if (onLongPress) {
      onLongPress();
    } else if (onQuickPreview) {
      onQuickPreview();
    }
  };

  return (
    <YStack
      width="100%"
      minWidth={0}
      maxWidth="100%"
      flexGrow={0}
      flexShrink={0}
      backgroundColor={tokens.surface}
      borderRadius={16}
      borderWidth={1}
      borderColor={tokens.border}
      overflow="hidden"
      cursor="pointer"
      onPress={onPress}
      onLongPress={isCompactSize || isMidSize ? handleTriggerQuickPreview : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      hoverStyle={{
        y: -4,
        borderColor: tokens.accent,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      }}
      pressStyle={{ scale: 0.985 }}
    >
      {/* Top Image Carousel Area with Natural Swipe Support */}
      <YStack
        height={imageHeight}
        position="relative"
        overflow="hidden"
        backgroundColor="#f3efe8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <LinearGradient
          colors={currentImage.gradient}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Wishlist Heart: Pure heart toggle without background box (Top-Right) */}
        <XStack position="absolute" top={isCompactSize ? 6 : 8} right={isCompactSize ? 6 : 8} zIndex={20}>
          <HeartButton
            size={heartButtonSize}
            active={isWishlisted}
            variant="plain"
            onPress={onWishlistPress}
          />
        </XStack>

        {/* Top-Left Image Count: Pure count only without background box or extra text */}
        <XStack
          position="absolute"
          top={isCompactSize ? 8 : 10}
          left={isCompactSize ? 8 : 10}
          zIndex={15}
          pointerEvents="none"
        >
          <Text
            fontSize={isCompactSize ? 11 : 12}
            fontWeight="800"
            color="#ffffff"
            letterSpacing={0.5}
            style={{
              textShadowColor: 'rgba(0, 0, 0, 0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {activeImageIndex + 1}/{cardImages.length}
          </Text>
        </XStack>

        {/* Carousel Previous Arrow (Rendered only when effectiveShowArrows is true) */}
        {effectiveShowArrows && cardImages.length > 1 && (
          <XStack
            position="absolute"
            top="50%"
            left={8}
            transform={[{ translateY: -14 }]}
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="rgba(255, 255, 255, 0.88)"
            alignItems="center"
            justifyContent="center"
            shadowColor="#000"
            shadowOpacity={0.15}
            shadowRadius={4}
            cursor="pointer"
            hoverStyle={{ scale: 1.12, backgroundColor: '#ffffff' }}
            onPress={handlePrevImage}
            zIndex={25}
            opacity={isHovered ? 1 : 0.4}
          >
            <LuChevronLeft size={16} color="#222" />
          </XStack>
        )}

        {/* Carousel Next Arrow (Rendered only when effectiveShowArrows is true) */}
        {effectiveShowArrows && cardImages.length > 1 && (
          <XStack
            position="absolute"
            top="50%"
            right={8}
            transform={[{ translateY: -14 }]}
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="rgba(255, 255, 255, 0.88)"
            alignItems="center"
            justifyContent="center"
            shadowColor="#000"
            shadowOpacity={0.15}
            shadowRadius={4}
            cursor="pointer"
            hoverStyle={{ scale: 1.12, backgroundColor: '#ffffff' }}
            onPress={handleNextImage}
            zIndex={25}
            opacity={isHovered ? 1 : 0.4}
          >
            <LuChevronRight size={16} color="#222" />
          </XStack>
        )}

        {/* Desktop Quick Preview: Plain Eye Icon Without Background */}
        {!isCompactSize && !isMidSize && (
          <XStack
            position="absolute"
            bottom={20}
            alignSelf="center"
            width={38}
            height={38}
            alignItems="center"
            justifyContent="center"
            opacity={isHovered ? 1 : 0}
            transform={[{ translateY: isHovered ? 0 : 4 }, { scale: isHovered ? 1 : 0.88 }]}
            zIndex={25}
            cursor="pointer"
            onPress={(e) => {
              e.stopPropagation();
              onQuickPreview?.() || onLongPress?.();
            }}
            hoverStyle={{ scale: 1.2 }}
            pressStyle={{ scale: 0.88 }}
          >
            <LuEye
              size={22}
              color="#ffffff"
              strokeWidth={2}
              style={{
                filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.75))',
              } as any}
            />
          </XStack>
        )}

        {/* Carousel Pagination Micro-Dots (Bottom) */}
        {cardImages.length > 1 && (
          <XStack
            position="absolute"
            bottom={6}
            left={0}
            right={0}
            justifyContent="center"
            alignItems="center"
            gap={4}
            zIndex={20}
          >
            {cardImages.map((_, idx) => (
              <XStack
                key={idx}
                width={idx === activeImageIndex ? (isCompactSize ? 10 : 14) : (isCompactSize ? 4 : 5)}
                height={isCompactSize ? 4 : 5}
                borderRadius={9999}
                backgroundColor={idx === activeImageIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'}
                shadowColor="#000"
                shadowOpacity={0.25}
                shadowRadius={2}
                cursor="pointer"
                onPress={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
              />
            ))}
          </XStack>
        )}
      </YStack>

      {/* Card Content Details */}
      <YStack padding={cardPadding} gap={isCompactSize ? 6 : 8}>
        {/* Rating and Swatches preview row */}
        <XStack justifyContent="space-between" alignItems="center">
          {rating ? (
            <XStack alignItems="center" gap={3}>
              <LuStar size={isCompactSize ? 11 : 12} color="#D4AF37" fill="#D4AF37" />
              <Text fontSize={isCompactSize ? 10 : 11} fontWeight="800" color="#333">
                {rating}
              </Text>
            </XStack>
          ) : (
            <Text fontSize={isCompactSize ? 9 : 10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
              Handloom Silk
            </Text>
          )}

          {/* Mini swatch preview dots */}
          {swatches && swatches.length > 0 && (
            <XStack gap={3} alignItems="center">
              {swatches.slice(0, isCompactSize ? 2 : 3).map((sw, idx) => (
                <CustomSwatchDot
                  key={sw.id || idx}
                  template={sw.template}
                  primaryColor={sw.primaryColor}
                  secondaryColor={sw.secondaryColor}
                  tertiaryColor={sw.tertiaryColor}
                  quaternaryColor={sw.quaternaryColor}
                  colorCount={sw.colorCount}
                  size={isCompactSize ? 12 : 14}
                  shape="circle"
                />
              ))}
              {swatches.length > (isCompactSize ? 2 : 3) && (
                <Text fontSize={isCompactSize ? 8 : 9} fontWeight="700" color="#777">
                  +{swatches.length - (isCompactSize ? 2 : 3)}
                </Text>
              )}
            </XStack>
          )}
        </XStack>

        {/* Fixed 2-Line Height Title Container for Uniform Grid Alignment */}
        <YStack height={titleContainerHeight} justifyContent="flex-start">
          <Text
            fontSize={titleFontSize}
            fontWeight="700"
            color={tokens.text}
            numberOfLines={2}
            ellipsizeMode="tail"
            lineHeight={titleLineHeight}
            letterSpacing={-0.3}
          >
            {name}
          </Text>
        </YStack>

        {/* Price Tag with discount */}
        <PriceTag
          price={price}
          originalPrice={originalPrice}
          size={priceTagSize}
        />
      </YStack>
    </YStack>
  );
}
