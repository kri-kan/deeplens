import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuShoppingBag,
  LuArrowRight,
  LuStar,
  LuShieldCheck,
  LuTruck,
  LuCheck,
} from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { PriceTag } from '../../atoms/PriceTag/PriceTag';
import { CustomSwatchDot, SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

export type QuickPreviewProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewsCount?: number;
  fabric?: string;
  color?: string;
  priceRange?: string;
  gradient?: [string, string];
  images?: { id: string; label?: string; gradient: [string, string] }[];
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
};

export type QuickPreviewModalProps = {
  open: boolean;
  product: QuickPreviewProduct | null;
  onClose: () => void;
  onAddToCart?: (product: QuickPreviewProduct, selectedSwatchLabel?: string) => void;
  onViewDetails?: (productName: string) => void;
};

export function QuickPreviewModal({
  open,
  product,
  onClose,
  onAddToCart,
  onViewDetails,
}: QuickPreviewModalProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);
  const [addedToBag, setAddedToBag] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setSelectedSwatchIndex(0);
    setAddedToBag(false);
  }, [product?.id]);

  if (!open || !product) return null;

  // Resolve images (at least 3-4 distinct views)
  const defaultImages = [
    { id: '1', label: 'Front Drape & Fall', gradient: product.gradient || (['#edd9c5', '#d2a77a'] as [string, string]) },
    { id: '2', label: 'Brocade Pallu & Zari', gradient: ['#fdf6e2', '#d4af37'] as [string, string] },
    { id: '3', label: 'Weave & Silk Mark Texture', gradient: ['#f5ece1', '#c79e65'] as [string, string] },
    { id: '4', label: 'Back Silhouette & Border', gradient: ['#ecd8c3', '#b88d55'] as [string, string] },
  ];
  const images = product.images && product.images.length > 0 ? product.images : defaultImages;
  const currentImage = images[activeImageIndex] || images[0];

  // Resolve swatches
  type SwatchItem = {
    id: string;
    label: string;
    template: SwatchTemplateType;
    primaryColor: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    colorCount?: 2 | 3 | 4;
  };
  const defaultSwatches: SwatchItem[] = [
    { id: 's1', label: 'Primary Shade', template: 'solid', primaryColor: '#D4AF37' },
    { id: 's2', label: 'Border Contrast', template: 'contrast-border', primaryColor: '#D4AF37', secondaryColor: '#C62828' },
    { id: 's3', label: 'Multi-Tone Shimmer', template: 'multi-tone', primaryColor: '#6A1B9A', secondaryColor: '#2E7D32', colorCount: 2 },
    { id: 's4', label: 'Festive Multi', template: 'multicolor', primaryColor: '#E91E63' },
  ];
  const swatches: SwatchItem[] = product.swatches && product.swatches.length > 0 ? product.swatches : defaultSwatches;
  const activeSwatch = swatches[selectedSwatchIndex] || swatches[0];

  const handlePrevImage = (e: any) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: any) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleAdd = (e: any) => {
    e.stopPropagation();
    setAddedToBag(true);
    onAddToCart?.(product, activeSwatch.label);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  return (
    <YStack
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0, 0, 0, 0.65)"
      zIndex={9999}
      alignItems="center"
      justifyContent="center"
      padding={isMobile ? 12 : 24}
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any}
      onPress={onClose}
    >
      {/* Modal Container */}
      <YStack
        width="100%"
        maxWidth={840}
        maxHeight="92vh"
        backgroundColor={tokens.surface}
        borderRadius={20}
        borderWidth={1.5}
        borderColor="#c4a43a"
        overflow="hidden"
        shadowColor="#000000"
        shadowOffset={{ width: 0, height: 20 }}
        shadowOpacity={0.3}
        shadowRadius={30}
        elevation={24}
        onPress={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon with Close Button */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={12}
          backgroundColor="#fcfbf7"
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap={8}>
            <XStack
              backgroundColor="#c4a43a"
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={4}
            >
              <Text fontSize={10} fontWeight="900" color="#ffffff" letterSpacing={0.8} textTransform="uppercase">
                Quick Preview
              </Text>
            </XStack>
            <Text fontSize={12} color="#888">
              Long-press preview mode
            </Text>
          </XStack>

          <XStack
            width={32}
            height={32}
            borderRadius={16}
            backgroundColor="#f0f0f0"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#e2e2e2' }}
            onPress={onClose}
          >
            <LuX size={18} color="#333" />
          </XStack>
        </XStack>

        {/* Modal Body: Split 2-Column on Desktop, Stack on Mobile */}
        <XStack
          flexDirection={isMobile ? 'column' : 'row'}
          overflow="scroll"
          maxHeight={isMobile ? '80vh' : 580}
        >
          {/* Left Column: Image Carousel Stage */}
          <YStack
            width={isMobile ? '100%' : '48%'}
            height={isMobile ? 320 : 540}
            position="relative"
            backgroundColor="#f5f2eb"
            overflow="hidden"
          >
            <LinearGradient
              colors={currentImage.gradient}
              style={{ width: '100%', height: '100%' }}
            />

            {/* Left Chevron */}
            <XStack
              position="absolute"
              top="50%"
              left={12}
              transform={[{ translateY: -18 }]}
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor="rgba(255, 255, 255, 0.9)"
              alignItems="center"
              justifyContent="center"
              shadowColor="#000"
              shadowOpacity={0.15}
              shadowRadius={6}
              cursor="pointer"
              hoverStyle={{ scale: 1.08, backgroundColor: '#ffffff' }}
              onPress={handlePrevImage}
              zIndex={20}
            >
              <LuChevronLeft size={20} color="#222" />
            </XStack>

            {/* Right Chevron */}
            <XStack
              position="absolute"
              top="50%"
              right={12}
              transform={[{ translateY: -18 }]}
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor="rgba(255, 255, 255, 0.9)"
              alignItems="center"
              justifyContent="center"
              shadowColor="#000"
              shadowOpacity={0.15}
              shadowRadius={6}
              cursor="pointer"
              hoverStyle={{ scale: 1.08, backgroundColor: '#ffffff' }}
              onPress={handleNextImage}
              zIndex={20}
            >
              <LuChevronRight size={20} color="#222" />
            </XStack>

            {/* Top-Left Image Label Badge */}
            <XStack
              position="absolute"
              top={14}
              left={14}
              backgroundColor="rgba(0, 0, 0, 0.55)"
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={6}
              backdropFilter="blur(4px)"
              zIndex={10}
            >
              <Text fontSize={11} fontWeight="700" color="#ffffff">
                {activeImageIndex + 1} / {images.length} · {currentImage.label || 'Drape View'}
              </Text>
            </XStack>

            {/* Bottom Pagination Dots */}
            <XStack
              position="absolute"
              bottom={14}
              left={0}
              right={0}
              justifyContent="center"
              alignItems="center"
              gap={6}
              zIndex={10}
            >
              {images.map((_, idx) => (
                <XStack
                  key={idx}
                  width={idx === activeImageIndex ? 18 : 6}
                  height={6}
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
          </YStack>

          {/* Right Column: Product Information & Interactive Actions */}
          <YStack
            flex={1}
            padding={isMobile ? 16 : 24}
            gap={14}
            justifyContent="space-between"
          >
            <YStack gap={10}>
              {/* Fabric & Tag Row */}
              <XStack alignItems="center" gap={8} flexWrap="wrap">
                <XStack
                  backgroundColor="#f8f5ee"
                  paddingHorizontal={10}
                  paddingVertical={3}
                  borderRadius={6}
                  borderWidth={1}
                  borderColor="#e5dec9"
                >
                  <Text fontSize={11} fontWeight="800" color="#8b6b23" textTransform="uppercase">
                    {product.fabric ? `${product.fabric} Silk` : 'Pure Mulberry Silk'}
                  </Text>
                </XStack>

                {/* Rating Badge */}
                <XStack alignItems="center" gap={4}>
                  <LuStar size={14} color="#D4AF37" fill="#D4AF37" />
                  <Text fontSize={12} fontWeight="800" color="#222">
                    {product.rating || 4.8}
                  </Text>
                  <Text fontSize={11} color="#777">
                    ({product.reviewsCount || 128} reviews)
                  </Text>
                </XStack>
              </XStack>

              {/* Title */}
              <Text
                fontSize={isMobile ? 18 : 22}
                fontWeight="900"
                color={tokens.text}
                lineHeight={isMobile ? 24 : 28}
                letterSpacing={-0.4}
              >
                {product.name}
              </Text>

              {/* Price & Savings */}
              <XStack alignItems="baseline" gap={12}>
                <PriceTag
                  price={product.price}
                  originalPrice={product.originalPrice}
                  size="lg"
                />
                {product.originalPrice && product.originalPrice > product.price && (
                  <XStack
                    backgroundColor="#e8f5e9"
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={4}
                  >
                    <Text fontSize={11} fontWeight="800" color="#2e7d32">
                      Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                    </Text>
                  </XStack>
                )}
              </XStack>

              {/* Color Variant Selector */}
              <YStack gap={8} marginTop={4}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} fontWeight="800" color="#333" textTransform="uppercase" letterSpacing={0.5}>
                    Colour Variant:
                  </Text>
                  <Text fontSize={12} fontWeight="700" color="#c4a43a">
                    {activeSwatch.label}
                  </Text>
                </XStack>

                <XStack gap={10} alignItems="center" flexWrap="wrap">
                  {swatches.map((sw, sIdx) => {
                    const isSelected = sIdx === selectedSwatchIndex;
                    return (
                      <XStack
                        key={sw.id}
                        cursor="pointer"
                        onPress={() => setSelectedSwatchIndex(sIdx)}
                        hoverStyle={{ scale: 1.1 }}
                      >
                        <CustomSwatchDot
                          template={sw.template}
                          primaryColor={sw.primaryColor}
                          secondaryColor={sw.secondaryColor}
                          tertiaryColor={sw.tertiaryColor}
                          quaternaryColor={sw.quaternaryColor}
                          colorCount={sw.colorCount}
                          size={34}
                          shape="circle"
                          selected={isSelected}
                        />
                      </XStack>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Certified Badges */}
              <YStack gap={6} marginTop={6} padding={10} backgroundColor="#faf9f6" borderRadius={10} borderWidth={1} borderColor="#eee">
                <XStack alignItems="center" gap={8}>
                  <LuShieldCheck size={16} color="#2e7d32" />
                  <Text fontSize={11} color="#444" fontWeight="600">
                    Authentic Handloom Certified · Pure Tested Zari
                  </Text>
                </XStack>
                <XStack alignItems="center" gap={8}>
                  <LuTruck size={16} color="#c4a43a" />
                  <Text fontSize={11} color="#444" fontWeight="600">
                    Free Express Shipping across India · 7-Day Easy Returns
                  </Text>
                </XStack>
              </YStack>
            </YStack>

            {/* Action Buttons */}
            <YStack gap={10} marginTop={12}>
              {/* Add to Bag Button */}
              <XStack
                backgroundColor={addedToBag ? '#2e7d32' : tokens.accent}
                paddingVertical={13}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                gap={8}
                cursor="pointer"
                hoverStyle={{ opacity: 0.92, scale: 1.01 }}
                pressStyle={{ scale: 0.98 }}
                onPress={handleAdd}
              >
                {addedToBag ? (
                  <>
                    <LuCheck size={18} color="#ffffff" />
                    <Text fontSize={14} fontWeight="900" color="#ffffff">
                      Added to Bag!
                    </Text>
                  </>
                ) : (
                  <>
                    <LuShoppingBag size={18} color="#ffffff" />
                    <Text fontSize={14} fontWeight="900" color="#ffffff">
                      Add to Bag
                    </Text>
                  </>
                )}
              </XStack>

              {/* View Full Details Button */}
              <XStack
                backgroundColor="transparent"
                borderWidth={1.5}
                borderColor={tokens.border}
                paddingVertical={11}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                gap={8}
                cursor="pointer"
                hoverStyle={{ borderColor: tokens.accent, backgroundColor: '#fcfbf8' }}
                onPress={() => {
                  onClose();
                  onViewDetails?.(product.name);
                }}
              >
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  View Full Product Page
                </Text>
                <LuArrowRight size={15} color={tokens.text} />
              </XStack>
            </YStack>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
