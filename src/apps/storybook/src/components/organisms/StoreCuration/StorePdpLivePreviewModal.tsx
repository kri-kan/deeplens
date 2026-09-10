import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuChevronLeft,
  LuChevronRight,
  LuPlay,
  LuPause,
  LuStar,
  LuVideo,
  LuShieldCheck,
  LuShare2,
  LuHeart,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { CustomSwatchDot } from '../../atoms/SwatchDot/CustomSwatchDot';
import { CarouselDot } from '../../atoms/CarouselDot/CarouselDot';
import { StoreColorGroup, StoreCurationMediaItem } from './types';

export interface StorePdpLivePreviewModalProps {
  productCode: string;
  title: string;
  fabric: string;
  mrp: number;
  salePrice: number;
  colorGroups: StoreColorGroup[];
  mediaList: StoreCurationMediaItem[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export function StorePdpLivePreviewModal({
  productCode,
  title,
  fabric,
  mrp,
  salePrice,
  colorGroups,
  mediaList,
  selectedGroupId,
  onSelectGroup,
  onClose,
  isStandalone = true,
}: StorePdpLivePreviewModalProps) {
  const { tokens } = useTheme();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const activeGroup = colorGroups.find((g) => g.id === selectedGroupId) || colorGroups[0];

  // Derive PDP media pool: qualified photos belonging to this group + universal common photos
  const pdpMedia = React.useMemo(() => {
    return mediaList
      .filter((m) => m.isQualified && (m.isCommon || m.colorGroupId === activeGroup?.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [mediaList, activeGroup]);

  const totalSlides = pdpMedia.length || 1;
  const currentMedia = pdpMedia[activeSlideIndex] || pdpMedia[0];

  const handleNextSlide = () => {
    setIsPlayingVideo(false);
    setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrevSlide = () => {
    setIsPlayingVideo(false);
    setActiveSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleSwatchSelect = (groupId: string) => {
    onSelectGroup(groupId);
    setActiveSlideIndex(0);
    setIsPlayingVideo(false);
  };

  const handlePlayVideo = () => {
    if (isPlayingVideo) {
      setIsPlayingVideo(false);
      return;
    }
    setIsBuffering(true);
    setTimeout(() => {
      setIsBuffering(false);
      setIsPlayingVideo(true);
    }, 600);
  };

  const discountPercent =
    mrp > salePrice && mrp > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

  const renderContent = () => (
    <YStack>
      {/* ── 1. MEDIA CAROUSEL (HEIGHT 380px) ── */}
      <View style={styles.carouselContainer}>
        {currentMedia ? (
          <Image
            source={{ uri: currentMedia.thumbnailUri || currentMedia.uri }}
            style={styles.carouselImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.emptyMedia}>
            <Text fontSize={12} color="#94A3B8">
              No Media in this Colorway
            </Text>
          </View>
        )}

        {/* Video Play Overlay */}
        {currentMedia?.mediaType === 'video' && (
          <View style={styles.videoOverlayContainer}>
            {isPlayingVideo ? (
              <View style={styles.activeVideoPlayer}>
                <XStack alignItems="center" gap={6}>
                  <View style={styles.greenDot} />
                  <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                    Live MP4 Stream (5.6MB)
                  </Text>
                </XStack>
                <Pressable onPress={handlePlayVideo} style={styles.videoPauseBtn} hitSlop={6}>
                  <LuPause size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handlePlayVideo} style={styles.playBigBtn} hitSlop={8}>
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <LuPlay size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Left / Right Chevron Controls */}
        <Pressable onPress={handlePrevSlide} style={[styles.navChevron, { left: 8 }]} hitSlop={8}>
          <LuChevronLeft size={18} color="#1E293B" />
        </Pressable>
        <Pressable onPress={handleNextSlide} style={[styles.navChevron, { right: 8 }]} hitSlop={8}>
          <LuChevronRight size={18} color="#1E293B" />
        </Pressable>

        {/* Top Badges (Counter + Common/Video Tag) */}
        <XStack position="absolute" top={10} left={10} zIndex={20} gap={6}>
          <View style={styles.counterBadge}>
            <Text fontSize={10} fontWeight="800" color="#FFFFFF">
              {activeSlideIndex + 1}/{totalSlides}
            </Text>
          </View>
          {currentMedia?.isCommon && (
            <View style={styles.commonTagBadge}>
              <LuStar size={10} color="#B45309" />
              <Text fontSize={9} fontWeight="800" color="#B45309">
                Universal Craft
              </Text>
            </View>
          )}
          {currentMedia?.mediaType === 'video' && (
            <View style={styles.videoTagBadge}>
              <LuVideo size={10} color="#FFFFFF" />
              <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                Reel Demo
              </Text>
            </View>
          )}
        </XStack>

        {/* ── CAROUSEL DOTS (CENTERED AT BOTTOM) ── */}
        <XStack
          position="absolute"
          bottom={12}
          left={0}
          right={0}
          zIndex={20}
          justifyContent="center"
          alignItems="center"
          gap={6}
        >
          {pdpMedia.map((_, idx) => (
            <CarouselDot
              key={idx}
              active={idx === activeSlideIndex}
              onPress={() => {
                setIsPlayingVideo(false);
                setActiveSlideIndex(idx);
              }}
            />
          ))}
        </XStack>
      </View>

      {/* ── 2. ETHNIC COLOR SWATCH ROW (DIRECTLY BELOW CAROUSEL) ── */}
      <YStack paddingHorizontal={14} paddingVertical={12} gap={6} borderBottomWidth={1} borderBottomColor="#F1F5F9">
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={6}>
            <Text fontSize={12} fontWeight="800" color="#1E293B" textTransform="uppercase">
              Colour: {activeGroup?.name || 'Standard'}
            </Text>
            <View style={styles.templateBadge}>
              <Text fontSize={9} fontWeight="700" color="#64748B">
                [{activeGroup?.template}]
              </Text>
            </View>
          </XStack>
          <Text fontSize={11} color="#64748B">
            {colorGroups.length} Shades
          </Text>
        </XStack>

        {/* CustomSwatchDot list */}
        <XStack gap={10} alignItems="center" paddingVertical={4}>
          {colorGroups.map((cg) => {
            const isSelected = cg.id === selectedGroupId;
            return (
              <Pressable
                key={cg.id}
                onPress={() => handleSwatchSelect(cg.id)}
                style={styles.swatchPressable}
              >
                <CustomSwatchDot
                  template={cg.template}
                  primaryColor={cg.slotA}
                  secondaryColor={cg.slotB || '#D4AF37'}
                  size={36}
                  selected={isSelected}
                />
                <Text
                  fontSize={10}
                  fontWeight={isSelected ? '800' : '500'}
                  color={isSelected ? '#1E293B' : '#64748B'}
                  textAlign="center"
                >
                  {cg.name.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* ── 3. PRODUCT TITLE & PRICING BLOCK ── */}
      <YStack padding={14} gap={8}>
        <Text fontSize={11} fontWeight="800" color="#94A3B8" textTransform="uppercase">
          {fabric} · Handloom
        </Text>
        <Text fontSize={16} fontWeight="800" color="#0F172A" lineHeight={22}>
          {title}
        </Text>

        <XStack alignItems="center" gap={10}>
          <Text fontSize={18} fontWeight="900" color="#0F172A">
            ₹{salePrice.toLocaleString('en-IN')}
          </Text>
          {mrp > salePrice && (
            <Text fontSize={13} color="#94A3B8" textDecorationLine="line-through">
              ₹{mrp.toLocaleString('en-IN')}
            </Text>
          )}
          {discountPercent > 0 && (
            <View style={styles.discountPill}>
              <Text fontSize={10} fontWeight="800" color="#15803D">
                {discountPercent}% OFF
              </Text>
            </View>
          )}
        </XStack>

        {/* Authenticity Guarantee */}
        <XStack
          backgroundColor="#F8FAFC"
          borderRadius={6}
          padding={8}
          alignItems="center"
          gap={6}
          borderWidth={1}
          borderColor="#E2E8F0"
        >
          <LuShieldCheck size={14} color="#16A34A" />
          <Text fontSize={10} color="#475569">
            Handcrafted in Banaras · Pure Silk &amp; Zari Tested
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );

  return (
    <YStack
      width="100%"
      maxWidth={390}
      height={isStandalone ? 640 : undefined}
      backgroundColor="#FFFFFF"
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      overflow="hidden"
      alignSelf="center"
      shadowColor="#000"
      shadowOpacity={0.15}
      shadowRadius={18}
    >
      {/* Mobile Top App Bar */}
      <XStack
        backgroundColor="#FFFFFF"
        borderBottomWidth={1}
        borderBottomColor="#E2E8F0"
        paddingHorizontal={12}
        paddingVertical={10}
        alignItems="center"
        justifyContent="space-between"
        zIndex={30}
      >
        <XStack alignItems="center" gap={6}>
          <Text fontSize={14} fontWeight="900" color="#1E293B" letterSpacing={1}>
            VAYYARI
          </Text>
          <View style={styles.codePill}>
            <Text fontSize={9} fontWeight="700" color="#64748B">
              {productCode}
            </Text>
          </View>
        </XStack>

        <XStack alignItems="center" gap={10}>
          <LuShare2 size={16} color="#64748B" />
          <LuHeart size={16} color="#64748B" />
          {onClose && (
            <Pressable onPress={onClose} hitSlop={6}>
              <Text fontSize={12} fontWeight="800" color="#EF4444">
                ✕ Close
              </Text>
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* Body: Standalone uses internal ScrollView with bounded height, Embedded renders flat */}
      {isStandalone ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {renderContent()}
        </ScrollView>
      ) : (
        renderContent()
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  carouselContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    zIndex: 1,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  emptyMedia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  videoOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  playBigBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activeVideoPlayer: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  videoPauseBtn: {
    padding: 4,
  },
  navChevron: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commonTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  templateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  swatchPressable: {
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  discountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
