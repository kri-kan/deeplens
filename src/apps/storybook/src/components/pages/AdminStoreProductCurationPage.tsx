import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuStore,
  LuEye,
  LuSave,
  LuCheck,
  LuX,
  LuPlus,
  LuMinus,
  LuStar,
  LuSparkles,
  LuVideo,
  LuImage,
  LuPalette,
  LuLayers,
  LuChevronRight,
  LuFileText,
  LuDollarSign,
  LuPlay,
  LuPause,
  LuShieldCheck,
  LuShare2,
  LuHeart,
  LuChevronLeft,
  LuPencil,
} from 'react-icons/lu';
import { ColorAssignmentPickerModal } from '../organisms/StoreCuration/ColorAssignmentPickerModal';
import { useTheme } from '../../theme';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  resolveColorHex,
} from '../atoms/SwatchDot/CustomSwatchDot';
import { CarouselDot } from '../atoms/CarouselDot/CarouselDot';
import {
  StoreCurationMediaItem,
  StoreColorGroup,
  StoreProductLifecycleState,
} from '../organisms/StoreCuration/types';
import {
  INITIAL_COLOR_GROUPS,
  MOCK_CURATION_MEDIA,
} from '../organisms/StoreCuration/mockCurationData';

export type CurationScreen = 'hub' | 'qualify_and_group' | 'metadata';
export type QualifyAndGroupStage = 'qualify' | 'swatches' | 'grouping';
export type CurationStage = 'qualification' | 'swatch_creation' | 'grouping' | 'metadata' | 'qualify' | 'swatches';

export interface AdminStoreProductCurationPageProps {
  productId?: string;
  productCode?: string;
  title?: string;
  fabric?: string;
  baseCostPrice?: number;
  initialMrp?: number;
  initialSalePrice?: number;
  initialLifecycleState?: StoreProductLifecycleState;
  initialDescription?: string;
  initialScreen?: CurationScreen;
  initialStage?: CurationStage;
  initialShowPreview?: boolean;
  initialMedia?: StoreCurationMediaItem[];
  initialColorGroups?: StoreColorGroup[];
  initialColorPickerGroupId?: string | null;
  onBack?: () => void;
  onSave?: (curatedPayload: any) => void;
}

const TEMPLATE_OPTIONS: { id: SwatchTemplateType; label: string; desc: string }[] = [
  { id: 'solid', label: 'Solid', desc: 'Single hue' },
  { id: 'contrast-border', label: 'Border', desc: 'Zari edge' },
  { id: 'multi-tone', label: 'Gradient', desc: 'Multi-tone' },
  { id: 'multi-shade', label: 'Split', desc: '2-way split' },
  { id: 'multicolor', label: 'Mosaic', desc: 'Pattern grid' },
];

export function AdminStoreProductCurationPage({
  productId = 'prod-vf2b58',
  productCode = 'VF2B58',
  title = 'Banarasi Dupion Silk Zari Saree',
  fabric = 'Banarasi Dupion Silk',
  baseCostPrice = 8499,
  initialMrp = 14999,
  initialSalePrice = 10999,
  initialLifecycleState = 'available',
  initialDescription = 'Woven on traditional pit looms in Varanasi, this Banarasi silk saree showcases intricate gold floral bootis, an opulent contrast zari pallu, and a scalloped border with matching unstitched blouse.',
  initialScreen,
  initialStage = 'qualification',
  initialShowPreview = false,
  initialMedia = MOCK_CURATION_MEDIA,
  initialColorGroups = INITIAL_COLOR_GROUPS,
  initialColorPickerGroupId = null,
  onBack,
  onSave,
}: AdminStoreProductCurationPageProps) {
  const { tokens } = useTheme();

  // ── STATE ──
  const resolveInitialScreen = (): CurationScreen => {
    if (initialScreen) return initialScreen;
    if (initialStage === 'metadata') return 'metadata';
    if (
      initialStage === 'qualification' ||
      initialStage === 'swatch_creation' ||
      initialStage === 'grouping' ||
      initialStage === 'qualify' ||
      initialStage === 'swatches'
    ) {
      return 'qualify_and_group';
    }
    return 'hub';
  };

  const resolveInitialStage = (): QualifyAndGroupStage => {
    if (initialStage === 'swatch_creation' || initialStage === 'swatches') return 'swatches';
    if (initialStage === 'grouping') return 'grouping';
    return 'qualify';
  };

  const [currentScreen, setCurrentScreen] = useState<CurationScreen>(resolveInitialScreen);
  const [currentStage, setCurrentStage] = useState<QualifyAndGroupStage>(resolveInitialStage);
  const [showPreview, setShowPreview] = useState<boolean>(initialShowPreview);
  const [mediaList, setMediaList] = useState<StoreCurationMediaItem[]>(initialMedia);
  const [swatchTemplate, setSwatchTemplate] = useState<SwatchTemplateType>('contrast-border');
  const [swatchCount, setSwatchCount] = useState<number>(initialColorGroups.length || 2);
  const [colorGroups, setColorGroups] = useState<StoreColorGroup[]>(initialColorGroups);

  // Grouping stage active selection: 'common' or specific group ID
  const [activeSwatchTab, setActiveSwatchTab] = useState<string>('common');
  const [colorPickerModalGroupId, setColorPickerModalGroupId] = useState<string | null>(initialColorPickerGroupId);

  // Metadata stage
  const [lifecycleState, setLifecycleState] = useState<StoreProductLifecycleState>(initialLifecycleState);
  const [description, setDescription] = useState(initialDescription);
  const [mrp, setMrp] = useState(initialMrp.toString());
  const [salePrice, setSalePrice] = useState(initialSalePrice.toString());
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Preview PDP interactive state
  const [previewActiveGroupId, setPreviewActiveGroupId] = useState<string>(
    colorGroups[0]?.id || 'cg-emerald'
  );
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [previewPlayingVideo, setPreviewPlayingVideo] = useState(false);
  const [previewBufferingVideo, setPreviewBufferingVideo] = useState(false);

  // Auto-extracted color centroids across media
  const extractedColors = useMemo(() => {
    const map = new Map<string, { hex: string; name: string; percentage: number }>();
    mediaList.forEach((m) => {
      (m.detectedColors || []).forEach((c) => {
        if (!map.has(c.hex) || c.percentage > (map.get(c.hex)?.percentage || 0)) {
          map.set(c.hex, c);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
  }, [mediaList]);

  // Qualified media list
  const qualifiedMedia = useMemo(() => mediaList.filter((m) => m.isQualified), [mediaList]);
  const commonMedia = useMemo(() => qualifiedMedia.filter((m) => m.isCommon), [qualifiedMedia]);

  // Sync color groups count when stepper changes (supports up to 2 digits: 1 to 99)
  const handleSetSwatchCount = (newCount: number) => {
    if (newCount < 1 || newCount > 99) return;
    setSwatchCount(newCount);

    if (newCount > colorGroups.length) {
      const added: StoreColorGroup[] = [];
      const FALLBACK_PALETTE = ['#1B4D3E', '#C0392B', '#1A2875', '#A0522D', '#722B2B', '#4A235A', '#196F3D', '#7D6608', '#283747', '#D4AF37'];
      for (let i = colorGroups.length; i < newCount; i++) {
        const fallbackHex = extractedColors[i]?.hex || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
        added.push({
          id: `cg-${i + 1}`,
          name: `Colorway ${i + 1}`,
          colorwayCode: `${productCode}-COL${i + 1}`,
          template: swatchTemplate,
          slotA: fallbackHex,
          slotB: '#D4AF37',
          isAvailable: true,
        });
      }
      setColorGroups([...colorGroups, ...added]);
    } else if (newCount < colorGroups.length) {
      const retained = colorGroups.slice(0, newCount);
      setColorGroups(retained);
      if (!retained.some((g) => g.id === activeSwatchTab) && activeSwatchTab !== 'common') {
        setActiveSwatchTab('common');
      }
    }
  };

  // ── STAGE PROGRESSION DEFINITIONS (QUALIFY & GROUP 3 STAGES) ──
  const QUALIFY_STAGES: { id: QualifyAndGroupStage; label: string; step: number }[] = [
    { id: 'qualify', label: '1. Qualify', step: 1 },
    { id: 'swatches', label: '2. Swatches', step: 2 },
    { id: 'grouping', label: '3. Grouping', step: 3 },
  ];

  const currentStageIndex = QUALIFY_STAGES.findIndex((s) => s.id === currentStage);

  // ── STAGE 1: TOGGLE QUALIFY ──
  const toggleQualifyMedia = (id: string) => {
    setMediaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isQualified: !item.isQualified } : item))
    );
  };

  // ── STAGE 3: MEDIA ASSIGNMENT ──
  const handleMediaTilePressInStage3 = (mediaId: string) => {
    if (activeSwatchTab === 'common') {
      // Toggle common status
      setMediaList((prev) =>
        prev.map((item) =>
          item.id === mediaId
            ? { ...item, isCommon: !item.isCommon, colorGroupId: !item.isCommon ? undefined : item.colorGroupId }
            : item
        )
      );
    } else {
      // Target is a specific color group
      setMediaList((prev) =>
        prev.map((item) => {
          if (item.id !== mediaId) return item;
          // If already in this group, unassign
          if (item.colorGroupId === activeSwatchTab) {
            return { ...item, colorGroupId: undefined };
          }
          // Otherwise assign to this group (cannot be common)
          return { ...item, colorGroupId: activeSwatchTab, isCommon: false };
        })
      );
    }
  };

  // ── STAGE 4: AI DESCRIPTION GENERATOR ──
  const handleAiGenerateDescription = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setDescription(
        `Authentic ${fabric} drape mastercrafted in Varanasi. Features Kadwa floral zari motifs, traditional hand-knotted tassels on the contrast pallu, and a running unstitched blouse piece. Engineered for grand celebrations with feather-light comfort.`
      );
      setIsAiGenerating(false);
    }, 600);
  };

  // ── SAVE HANDLER ──
  const handleSaveCuration = () => {
    const payload = {
      productCode,
      title,
      fabric,
      mrp: parseFloat(mrp) || 0,
      salePrice: parseFloat(salePrice) || 0,
      description,
      mediaList,
      colorGroups,
    };
    onSave?.(payload);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  // ── PREVIEW FILTERED MEDIA ──
  const previewMedia = useMemo(() => {
    const activeGroup = colorGroups.find((g) => g.id === previewActiveGroupId) || colorGroups[0];
    return qualifiedMedia
      .filter((m) => m.isCommon || m.colorGroupId === activeGroup?.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [qualifiedMedia, colorGroups, previewActiveGroupId]);

  const currentPreviewMedia = previewMedia[previewSlideIndex] || previewMedia[0];

  const handlePreviewPlayVideo = () => {
    if (previewPlayingVideo) {
      setPreviewPlayingVideo(false);
      return;
    }
    setPreviewBufferingVideo(true);
    setTimeout(() => {
      setPreviewBufferingVideo(false);
      setPreviewPlayingVideo(true);
    }, 550);
  };

  // Calculations
  const parsedMrp = parseFloat(mrp) || 0;
  const parsedSalePrice = parseFloat(salePrice) || 0;
  const discountPercent =
    parsedMrp > parsedSalePrice && parsedMrp > 0
      ? Math.round(((parsedMrp - parsedSalePrice) / parsedMrp) * 100)
      : 0;
  const grossMargin = parsedSalePrice - baseCostPrice;
  const marginPercent =
    parsedSalePrice > 0 ? Math.round((grossMargin / parsedSalePrice) * 100) : 0;

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: PREVIEW MODE (FULL 390px PDP SIMULATION)
  // ──────────────────────────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <YStack
        width="100%"
        maxWidth={390}
        height={680}
        backgroundColor="#FFFFFF"
        borderRadius={tokens.radius.lg}
        borderWidth={1}
        borderColor={tokens.border}
        overflow="hidden"
        alignSelf="center"
        position="relative"
      >
        {/* Preview Header */}
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

          <Pressable onPress={() => setShowPreview(false)} hitSlop={8} style={styles.exitPreviewChip}>
            <Text fontSize={11} fontWeight="800" color="#DC2626">
              ✕ Exit Preview
            </Text>
          </Pressable>
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* 1. Media Carousel (Height 380px) */}
          <View style={styles.previewCarousel}>
            {currentPreviewMedia ? (
              <Image
                source={{ uri: currentPreviewMedia.thumbnailUri || currentPreviewMedia.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Text fontSize={12} color="#94A3B8">
                  No media in this colorway
                </Text>
              </View>
            )}

            {/* Video Play Overlay */}
            {currentPreviewMedia?.mediaType === 'video' && (
              <View style={styles.videoOverlay}>
                {previewPlayingVideo ? (
                  <View style={styles.videoLiveBar}>
                    <View style={styles.greenDot} />
                    <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                      Streaming Reel (5.6MB)
                    </Text>
                    <Pressable onPress={handlePreviewPlayVideo} hitSlop={6}>
                      <LuPause size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={handlePreviewPlayVideo} style={styles.playBigBtn}>
                    {previewBufferingVideo ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <LuPlay size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
                    )}
                  </Pressable>
                )}
              </View>
            )}

            {/* Chevrons */}
            <Pressable
              onPress={() => {
                setPreviewPlayingVideo(false);
                setPreviewSlideIndex((prev) => (prev - 1 + previewMedia.length) % previewMedia.length);
              }}
              style={[styles.carouselChevron, { left: 8 }]}
              hitSlop={8}
            >
              <LuChevronLeft size={18} color="#1E293B" />
            </Pressable>

            <Pressable
              onPress={() => {
                setPreviewPlayingVideo(false);
                setPreviewSlideIndex((prev) => (prev + 1) % previewMedia.length);
              }}
              style={[styles.carouselChevron, { right: 8 }]}
              hitSlop={8}
            >
              <LuChevronRight size={18} color="#1E293B" />
            </Pressable>

            {/* Top Badges */}
            <XStack position="absolute" top={10} left={10} zIndex={20} gap={6}>
              <View style={styles.slideCounter}>
                <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                  {previewSlideIndex + 1}/{previewMedia.length}
                </Text>
              </View>
              {currentPreviewMedia?.isCommon && (
                <View style={styles.commonPreviewTag}>
                  <LuStar size={10} color="#B45309" />
                  <Text fontSize={9} fontWeight="800" color="#B45309">
                    Universal Craft
                  </Text>
                </View>
              )}
            </XStack>

            {/* Carousel Dots */}
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
              {previewMedia.map((_, idx) => (
                <CarouselDot
                  key={idx}
                  active={idx === previewSlideIndex}
                  onPress={() => {
                    setPreviewPlayingVideo(false);
                    setPreviewSlideIndex(idx);
                  }}
                />
              ))}
            </XStack>
          </View>

          {/* 2. Color Swatch Row Directly Below Carousel */}
          <YStack paddingHorizontal={14} paddingVertical={10} gap={6} borderBottomWidth={1} borderBottomColor="#F1F5F9">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={11} fontWeight="800" color="#1E293B" textTransform="uppercase">
                Colour: {colorGroups.find((g) => g.id === previewActiveGroupId)?.name || 'Standard'}
              </Text>
              <Text fontSize={10} color="#64748B">
                {colorGroups.length} Swatches
              </Text>
            </XStack>

            <XStack gap={10} alignItems="center" paddingVertical={4}>
              {colorGroups.map((cg) => {
                const isSelected = cg.id === previewActiveGroupId;
                return (
                  <Pressable
                    key={cg.id}
                    onPress={() => {
                      setPreviewActiveGroupId(cg.id);
                      setPreviewSlideIndex(0);
                      setPreviewPlayingVideo(false);
                    }}
                    style={styles.previewSwatchBtn}
                  >
                    <CustomSwatchDot
                      template={cg.template}
                      primaryColor={cg.slotA}
                      secondaryColor={cg.slotB || '#D4AF37'}
                      tertiaryColor={cg.slotC}
                      quaternaryColor={cg.slotD}
                      colors={cg.colors}
                      colorCount={cg.colorCount as any}
                      size={36}
                      selected={isSelected}
                    />
                    <Text fontSize={9} fontWeight={isSelected ? '800' : '600'} color={isSelected ? '#1E293B' : '#64748B'}>
                      {cg.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>

          {/* 3. Product Details */}
          <YStack padding={14} gap={8}>
            <Text fontSize={11} fontWeight="800" color="#94A3B8" textTransform="uppercase">
              {fabric} · Handloom
            </Text>
            <Text fontSize={16} fontWeight="800" color="#0F172A">
              {title}
            </Text>

            <XStack alignItems="center" gap={8}>
              <Text fontSize={18} fontWeight="900" color="#0F172A">
                ₹{parsedSalePrice.toLocaleString('en-IN')}
              </Text>
              {parsedMrp > parsedSalePrice && (
                <Text fontSize={13} color="#94A3B8" textDecorationLine="line-through">
                  ₹{parsedMrp.toLocaleString('en-IN')}
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

            <Text fontSize={12} color="#475569" lineHeight={18}>
              {description}
            </Text>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: MAIN PROGRESSIVE CURATION WORKBENCH (390px MOBILE)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={400}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP HEADER BAR ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={14}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8} flex={1}>
          {currentScreen === 'hub' ? (
            onBack ? (
              <Pressable onPress={onBack} hitSlop={8} style={styles.topIconBtn}>
                <LuArrowLeft size={18} color={tokens.text} />
              </Pressable>
            ) : null
          ) : (
            <Pressable onPress={() => setCurrentScreen('hub')} hitSlop={8} style={styles.topIconBtn}>
              <LuArrowLeft size={18} color={tokens.text} />
            </Pressable>
          )}
          <YStack flex={1} marginRight={6}>
            <XStack alignItems="center" gap={5}>
              <LuStore size={15} color={tokens.accent} />
              <Text fontSize={15} fontWeight="900" color={tokens.text} numberOfLines={1}>
                {currentScreen === 'hub'
                  ? 'Store Curation'
                  : currentScreen === 'qualify_and_group'
                  ? 'Qualify & Group'
                  : 'Product Metadata'}
              </Text>
            </XStack>
            <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
              {currentScreen === 'hub'
                ? `${productCode} · ${title}`
                : currentScreen === 'qualify_and_group'
                ? `Stage ${currentStageIndex + 1} of 3 · ${productCode}`
                : `Story, AI & Commercial Margins · ${productCode}`}
            </Text>
          </YStack>
        </XStack>

        {/* Top-Right 2 Icons: Preview & Save */}
        <XStack alignItems="center" gap={8}>
          <Pressable
            onPress={() => setShowPreview(true)}
            hitSlop={6}
            style={[styles.topIconBtn, { backgroundColor: `${tokens.accent}14`, borderColor: tokens.accent }]}
            accessibilityLabel="Live PDP Preview"
          >
            <LuEye size={18} color={tokens.accent} />
          </Pressable>

          <Pressable
            onPress={handleSaveCuration}
            hitSlop={6}
            style={[styles.topIconBtn, { backgroundColor: tokens.accent }]}
            accessibilityLabel="Save Curation"
          >
            <LuSave size={18} color={tokens.accentForeground} />
          </Pressable>
        </XStack>
      </XStack>

      {/* Save Notification Toast */}
      {saveToast && (
        <XStack
          backgroundColor="#10B981"
          paddingHorizontal={12}
          paddingVertical={6}
          alignItems="center"
          justifyContent="center"
          gap={6}
        >
          <LuCheck size={14} color="#FFFFFF" strokeWidth={3} />
          <Text fontSize={11} fontWeight="800" color="#FFFFFF">
            Curation Saved &amp; Synced!
          </Text>
        </XStack>
      )}

      {/* ── STAGE DELIVERY TIMELINE PROGRESS STEPPER (QUALIFY & GROUP: 3 STAGES) ── */}
      {currentScreen === 'qualify_and_group' && (
        <YStack backgroundColor={tokens.surface} borderBottomWidth={1} borderBottomColor={tokens.border} paddingVertical={10} paddingHorizontal={12}>
          <XStack alignItems="center" justifyContent="space-between" position="relative">
            {/* Background Track Line */}
            <View style={[styles.timelineTrack, { backgroundColor: tokens.border }]} />

            {QUALIFY_STAGES.map((s, idx) => {
              const isActive = currentStage === s.id;
              const isCompleted = currentStageIndex > idx;

              return (
                <Pressable
                  key={s.id}
                  onPress={() => setCurrentStage(s.id)}
                  style={styles.timelineNodeContainer}
                >
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isActive
                          ? tokens.accent
                          : isCompleted
                          ? '#10B981'
                          : tokens.surfaceRaised,
                        borderColor: isActive
                          ? tokens.accent
                          : isCompleted
                          ? '#10B981'
                          : tokens.border,
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Text
                        fontSize={10}
                        fontWeight="800"
                        color={isActive ? tokens.accentForeground : tokens.textMuted}
                      >
                        {s.step}
                      </Text>
                    )}
                  </View>
                  <Text
                    fontSize={10}
                    fontWeight={isActive ? '800' : '600'}
                    color={isActive ? tokens.accent : tokens.textMuted}
                    marginTop={4}
                  >
                    {s.label.split('. ')[1]}
                  </Text>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>
      )}

      {/* ── SCROLLABLE STAGE CONTENT ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, paddingBottom: currentScreen === 'hub' ? 24 : 90 }}
      >
        {/* =========================================================================
            STAGE 1: MEDIA QUALIFICATION (3 TILES PER ROW, VERTICAL SCROLL)
           ========================================================================= */}
        {/* =========================================================================
            STORE CURATION HUB: 2 PROMINENT SELECTION TILES (QUALIFY & GROUP / METADATA)
           ========================================================================= */}
        {currentScreen === 'hub' && (
          <YStack gap={14}>
            {/* Product Overview Card */}
            <View style={styles.hubProductCard}>
              <XStack alignItems="center" gap={12}>
                <Image
                  source={{ uri: mediaList[0]?.thumbnailUri || mediaList[0]?.uri }}
                  style={styles.hubProductThumb}
                  resizeMode="cover"
                />
                <YStack flex={1}>
                  <Text fontSize={10} fontWeight="800" color={tokens.accent} textTransform="uppercase">
                    {productCode} · {fabric}
                  </Text>
                  <Text fontSize={14} fontWeight="900" color={tokens.text} numberOfLines={1}>
                    {title}
                  </Text>
                  <XStack alignItems="center" gap={6} marginTop={4} flexWrap="wrap">
                    <View style={[styles.hubStatusPill, { backgroundColor: '#DCFCE7' }]}>
                      <Text fontSize={9} fontWeight="800" color="#15803D">
                        {lifecycleState.toUpperCase()}
                      </Text>
                    </View>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Sale: ₹{Number(salePrice).toLocaleString('en-IN')} · Cost: ₹{baseCostPrice.toLocaleString('en-IN')}
                    </Text>
                  </XStack>
                </YStack>
              </XStack>
            </View>

            <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
              Curation Sections
            </Text>

            {/* Tile 1: Qualify & Group (3 Stages: Qualify > Swatches > Grouping) */}
            <Pressable
              onPress={() => {
                setCurrentScreen('qualify_and_group');
                setCurrentStage('qualify');
              }}
              style={({ pressed }) => [
                styles.hubFeatureTile,
                {
                  borderColor: tokens.border,
                  backgroundColor: pressed ? `${tokens.accent}08` : tokens.surface,
                },
              ]}
            >
              <XStack alignItems="flex-start" justifyContent="space-between">
                <XStack gap={12} flex={1}>
                  <View style={[styles.hubTileIconWrapper, { backgroundColor: `${tokens.accent}14` }]}>
                    <LuLayers size={22} color={tokens.accent} />
                  </View>
                  <YStack flex={1} gap={3}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={15} fontWeight="900" color={tokens.text}>
                        Qualify &amp; Group
                      </Text>
                      <View style={[styles.hubTileBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text fontSize={9} fontWeight="800" color="#B45309">
                          3 Stages
                        </Text>
                      </View>
                    </XStack>
                    <Text fontSize={11} color={tokens.textMuted} lineHeight={16}>
                      Qualify storefront media, configure ethnic swatches &amp; map variant photos.
                    </Text>

                    {/* Flow Steps Breadcrumb */}
                    <XStack alignItems="center" gap={4} marginTop={4}>
                      <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                        Qualify ➔ Swatches ➔ Grouping
                      </Text>
                    </XStack>

                    {/* Metric Chips */}
                    <XStack alignItems="center" gap={6} marginTop={6} flexWrap="wrap">
                      <View style={styles.hubMetricChip}>
                        <LuImage size={11} color={tokens.textMuted} />
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          {qualifiedMedia.length} Qualified
                        </Text>
                      </View>
                      <View style={styles.hubMetricChip}>
                        <LuPalette size={11} color={tokens.textMuted} />
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          {swatchCount} Swatches
                        </Text>
                      </View>
                      <View style={styles.hubMetricChip}>
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          {swatchTemplate.toUpperCase()}
                        </Text>
                      </View>
                    </XStack>
                  </YStack>
                </XStack>

                <View style={styles.hubTileChevron}>
                  <LuChevronRight size={18} color={tokens.textMuted} />
                </View>
              </XStack>
            </Pressable>

            {/* Tile 2: Metadata (Story, AI & Commercial Pricing Margins) */}
            <Pressable
              onPress={() => setCurrentScreen('metadata')}
              style={({ pressed }) => [
                styles.hubFeatureTile,
                {
                  borderColor: tokens.border,
                  backgroundColor: pressed ? `${tokens.accent}08` : tokens.surface,
                },
              ]}
            >
              <XStack alignItems="flex-start" justifyContent="space-between">
                <XStack gap={12} flex={1}>
                  <View style={[styles.hubTileIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                    <LuFileText size={22} color="#16A34A" />
                  </View>
                  <YStack flex={1} gap={3}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={15} fontWeight="900" color={tokens.text}>
                        Metadata
                      </Text>
                      <View style={[styles.hubTileBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text fontSize={9} fontWeight="800" color="#15803D">
                          AI &amp; Pricing
                        </Text>
                      </View>
                    </XStack>
                    <Text fontSize={11} color={tokens.textMuted} lineHeight={16}>
                      Craft story narrative, AI synthesis, commercial pricing margins &amp; lifecycle state.
                    </Text>

                    {/* Pricing / Margin Summary Chips */}
                    <XStack alignItems="center" gap={6} marginTop={6} flexWrap="wrap">
                      <View style={styles.hubMetricChip}>
                        <LuDollarSign size={11} color="#16A34A" />
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          ₹{Number(salePrice).toLocaleString('en-IN')} ({discountPercent}% OFF)
                        </Text>
                      </View>
                      <View style={styles.hubMetricChip}>
                        <LuSparkles size={11} color={tokens.accent} />
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          {marginPercent}% Margin
                        </Text>
                      </View>
                    </XStack>
                  </YStack>
                </XStack>

                <View style={styles.hubTileChevron}>
                  <LuChevronRight size={18} color={tokens.textMuted} />
                </View>
              </XStack>
            </Pressable>
          </YStack>
        )}

        {/* =========================================================================
            STAGE 1: MEDIA QUALIFICATION (QUALIFY & GROUP FLOW)
           ========================================================================= */}
        {currentScreen === 'qualify_and_group' && (currentStage === 'qualify' || (currentStage as any) === 'qualification') && (
          <YStack gap={8}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                Catalog Media ({mediaList.length})
              </Text>
              <View style={[styles.statusPill, { backgroundColor: `${tokens.accent}14` }]}>
                <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                  {qualifiedMedia.length} of {mediaList.length} Qualified
                </Text>
              </View>
            </XStack>

            {/* 3 Tiles per Row Grid - Edge to Edge */}
            <XStack flexWrap="wrap" gap={4} justifyContent="space-between" marginHorizontal={-12} paddingHorizontal={4}>
              {mediaList.map((item) => {
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleQualifyMedia(item.id)}
                    style={[
                      styles.mediaTile,
                      {
                        borderColor: item.isQualified ? tokens.accent : tokens.border,
                        borderWidth: item.isQualified ? 2 : 1,
                        opacity: item.isQualified ? 1 : 0.45,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.thumbnailUri || item.uri }}
                      style={styles.tileImage}
                      resizeMode="cover"
                    />

                    {/* Top Corner Checkbox */}
                    <View
                      style={[
                        styles.tileCheckbox,
                        {
                          backgroundColor: item.isQualified ? tokens.accent : 'rgba(0,0,0,0.55)',
                          borderColor: item.isQualified ? tokens.accent : '#FFFFFF',
                        },
                      ]}
                    >
                      {item.isQualified ? (
                        <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <LuX size={10} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Video Badge */}
                    {item.mediaType === 'video' && (
                      <View style={styles.tileVideoBadge}>
                        <LuVideo size={9} color="#FFFFFF" />
                        <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                          {item.durationSeconds ? `0:${item.durationSeconds}` : 'VIDEO'}
                        </Text>
                      </View>
                    )}

                    {/* Order Badge */}
                    <View style={styles.tileOrderBadge}>
                      <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                        #{item.sortOrder}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>
        )}

        {/* =========================================================================
            STAGE 2: COLOR SWATCH CREATION (2x3 GRID: 5 SWATCHES + 1 COUNT STEPPER)
           ========================================================================= */}
        {currentScreen === 'qualify_and_group' && (currentStage === 'swatches' || (currentStage as any) === 'swatch_creation') && (
          <YStack gap={10}>
            {/* 2 Rows of 3 Compact Square Tiles - Edge to Edge without horizontal gaps */}
            <XStack flexWrap="wrap" gap={4} justifyContent="space-between" marginHorizontal={-12} paddingHorizontal={4}>
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = swatchTemplate === tpl.id;
                return (
                  <Pressable
                    key={tpl.id}
                    onPress={() => {
                      setSwatchTemplate(tpl.id);
                      setColorGroups(colorGroups.map((g) => ({ ...g, template: tpl.id })));
                    }}
                    style={[
                      styles.compactSwatchSquareTile,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    {/* Top Right Selected Check */}
                    {isSelected && (
                      <View style={[styles.swatchTileSelectedCheck, { backgroundColor: tokens.accent }]}>
                        <LuCheck size={9} color={tokens.accentForeground} strokeWidth={3} />
                      </View>
                    )}

                    <CustomSwatchDot
                      template={tpl.id}
                      primaryColor="#1B4D3E"
                      secondaryColor="#D4AF37"
                      size={36}
                      selected={isSelected}
                    />
                    <Text
                      fontSize={12}
                      fontWeight={isSelected ? '900' : '700'}
                      color={isSelected ? tokens.accent : tokens.text}
                      numberOfLines={1}
                    >
                      {tpl.label}
                    </Text>
                    <Text fontSize={8.5} color={tokens.textMuted} numberOfLines={1}>
                      {tpl.desc}
                    </Text>
                  </Pressable>
                );
              })}

              {/* 6th Tile: Swatch Count Stepper [-] Count [+] */}
              <View
                style={[
                  styles.compactSwatchSquareTile,
                  {
                    backgroundColor: tokens.surfaceRaised,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 4,
                  },
                ]}
              >
                <Text
                  fontSize={9}
                  fontWeight="800"
                  color={tokens.textMuted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                  numberOfLines={1}
                >
                  Swatch Count
                </Text>

                <XStack alignItems="center" justifyContent="space-between" width="100%" paddingHorizontal={4}>
                  <Pressable
                    onPress={() => handleSetSwatchCount(swatchCount - 1)}
                    disabled={swatchCount <= 1}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.compactStepperBtn,
                      {
                        opacity: swatchCount <= 1 ? 0.3 : pressed ? 0.7 : 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    accessibilityLabel="Decrease swatch count"
                  >
                    <LuMinus size={14} color={tokens.text} strokeWidth={2.5} />
                  </Pressable>

                  <Text fontSize={24} fontWeight="900" color={tokens.accent}>
                    {swatchCount}
                  </Text>

                  <Pressable
                    onPress={() => handleSetSwatchCount(swatchCount + 1)}
                    disabled={swatchCount >= 99}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.compactStepperBtn,
                      {
                        opacity: swatchCount >= 99 ? 0.3 : pressed ? 0.7 : 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    accessibilityLabel="Increase swatch count"
                  >
                    <LuPlus size={14} color={tokens.text} strokeWidth={2.5} />
                  </Pressable>
                </XStack>
              </View>
            </XStack>

            {/* Media Reference (All Qualified Media) */}
            <YStack gap={6} marginTop={4}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  Selected Media Reference ({qualifiedMedia.length}):
                </Text>
                <Text fontSize={10} color={tokens.textMuted}>
                  Review visual variations
                </Text>
              </XStack>

              <XStack flexWrap="wrap" gap={4} justifyContent="space-between" marginHorizontal={-12} paddingHorizontal={4}>
                {qualifiedMedia.map((m) => (
                  <View key={m.id} style={styles.miniRefTile}>
                    <Image source={{ uri: m.thumbnailUri || m.uri }} style={styles.tileImage} resizeMode="cover" />
                    {m.mediaType === 'video' && (
                      <View style={styles.tileVideoBadge}>
                        <LuVideo size={8} color="#fff" />
                        <Text fontSize={8} fontWeight="800" color="#fff">
                          {m.durationSeconds ? `0:${m.durationSeconds}` : 'VIDEO'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.tileOrderBadge}>
                      <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                        #{m.sortOrder}
                      </Text>
                    </View>
                  </View>
                ))}
              </XStack>
            </YStack>
          </YStack>
        )}

        {/* =========================================================================
            STAGE 3: MEDIA ASSIGNMENT TO SWATCHES & UNIVERSAL COMMON (C)
           ========================================================================= */}
        {currentScreen === 'qualify_and_group' && currentStage === 'grouping' && (
          <YStack gap={8}>
            {/* Horizontal Swipable Swatch Heads Row - Edge to Edge */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }} style={{ marginHorizontal: -12 }}>
              {/* Head 0: Default Common Swatch [C] */}
              <Pressable
                onPress={() => setActiveSwatchTab('common')}
                style={[
                  styles.swatchHeadCard,
                  {
                    backgroundColor: activeSwatchTab === 'common' ? '#FEF3C7' : tokens.surface,
                    borderColor: activeSwatchTab === 'common' ? '#D97706' : tokens.border,
                    borderWidth: activeSwatchTab === 'common' ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.commonCBadge}>
                  <Text fontSize={16} fontWeight="900" color="#B45309">
                    C
                  </Text>
                  {/* Overlay Count */}
                  <View style={[styles.headOverlayCount, { backgroundColor: '#B45309' }]}>
                    <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                      {commonMedia.length}
                    </Text>
                  </View>
                </View>
                <Text fontSize={10} fontWeight={activeSwatchTab === 'common' ? '800' : '600'} color={activeSwatchTab === 'common' ? '#B45309' : tokens.text}>
                  Universal
                </Text>
              </Pressable>

              {/* Heads 1..N: Color Swatches (Strictly Mirroring swatchTemplate) */}
              {colorGroups.slice(0, swatchCount).map((cg, idx) => {
                const isSelected = activeSwatchTab === cg.id;
                const assignedCount = qualifiedMedia.filter((m) => m.colorGroupId === cg.id && !m.isCommon).length;

                return (
                  <Pressable
                    key={cg.id}
                    onPress={() => setActiveSwatchTab(cg.id)}
                    onLongPress={() => {
                      if (swatchTemplate !== 'multicolor') {
                        setColorPickerModalGroupId(cg.id);
                      }
                    }}
                    delayLongPress={350}
                    style={[
                      styles.swatchHeadCard,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={{ position: 'relative' }}>
                      <CustomSwatchDot
                        template={swatchTemplate}
                        primaryColor={cg.slotA}
                        secondaryColor={cg.slotB || '#D4AF37'}
                        tertiaryColor={cg.slotC}
                        quaternaryColor={cg.slotD}
                        colors={cg.colors}
                        colorCount={cg.colorCount as any}
                        size={38}
                        selected={isSelected}
                      />
                      {/* Overlay Count Badge */}
                      <View style={[styles.headOverlayCount, { backgroundColor: tokens.accent }]}>
                        <Text fontSize={9} fontWeight="800" color={tokens.accentForeground}>
                          {assignedCount}
                        </Text>
                      </View>
                    </View>
                    <XStack alignItems="center" gap={3}>
                      <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={tokens.text}>
                        {cg.name.split(' ')[0]} #{idx + 1}
                      </Text>
                      {swatchTemplate !== 'multicolor' && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setColorPickerModalGroupId(cg.id);
                          }}
                          hitSlop={6}
                          style={styles.swatchPencilBtn}
                          accessibilityLabel="Edit colors"
                        >
                          <LuPencil size={8} color={tokens.textMuted} />
                        </Pressable>
                      )}
                    </XStack>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 3 Tiles per Row Media Assignment Grid - Edge to Edge */}
            <XStack flexWrap="wrap" gap={4} justifyContent="space-between" marginHorizontal={-12} paddingHorizontal={4}>
              {qualifiedMedia.map((m) => {
                const isSelectedInActive =
                  activeSwatchTab === 'common'
                    ? m.isCommon
                    : m.colorGroupId === activeSwatchTab && !m.isCommon;

                const isLockedInCommon = activeSwatchTab !== 'common' && m.isCommon;

                return (
                  <Pressable
                    key={m.id}
                    disabled={isLockedInCommon}
                    onPress={() => handleMediaTilePressInStage3(m.id)}
                    style={[
                      styles.mediaTile,
                      {
                        borderColor: isSelectedInActive
                          ? activeSwatchTab === 'common'
                            ? '#D97706'
                            : tokens.accent
                          : tokens.border,
                        borderWidth: isSelectedInActive ? 2.5 : 1,
                        opacity: isLockedInCommon ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Image source={{ uri: m.thumbnailUri || m.uri }} style={styles.tileImage} resizeMode="cover" />

                    {/* Common Star Badge if marked common */}
                    {m.isCommon && (
                      <View style={styles.commonTileStar}>
                        <LuStar size={10} color="#FFFFFF" />
                      </View>
                    )}

                    {/* Selection Indicator */}
                    {isSelectedInActive && (
                      <View
                        style={[
                          styles.tileCheckbox,
                          { backgroundColor: activeSwatchTab === 'common' ? '#D97706' : tokens.accent },
                        ]}
                      >
                        <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}

                    {/* Locked in Common overlay badge */}
                    {isLockedInCommon && (
                      <View style={styles.lockedCommonBadge}>
                        <Text fontSize={8} fontWeight="800" color="#B45309">
                          IN COMMON
                        </Text>
                      </View>
                    )}

                    {/* Video Badge */}
                    {m.mediaType === 'video' && (
                      <View style={styles.tileVideoBadge}>
                        <LuVideo size={8} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>
        )}

        {/* =========================================================================
            STAGE 4: METADATA & PRICING ENRICHMENT
           ========================================================================= */}
        {currentScreen === 'metadata' && (
          <YStack gap={14}>
            <YStack gap={2}>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                4. Story &amp; Commercial Margins
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Set craft narrative and commercial pricing margins for the live PDP.
              </Text>
            </YStack>

            {/* AI Craft Description Generator */}
            <YStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              padding={12}
              gap={8}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
                  Weave &amp; Craft Narrative:
                </Text>
                <Pressable
                  onPress={handleAiGenerateDescription}
                  disabled={isAiGenerating}
                  style={styles.aiGenBtn}
                >
                  <LuSparkles size={12} color={tokens.accent} />
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    {isAiGenerating ? 'Synthesizing...' : '✨ AI Generate'}
                  </Text>
                </Pressable>
              </XStack>

              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={styles.descriptionInput}
                placeholder="Enter weaver narrative, zari details, and drape feel..."
              />
            </YStack>

            {/* Pricing & Margin Calculator */}
            <YStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              padding={12}
              gap={10}
            >
              <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
                Commercial Pricing Engine:
              </Text>

              <XStack gap={10}>
                <YStack flex={1} gap={4}>
                  <Text fontSize={10} color={tokens.textMuted}>
                    MRP (Strikethrough):
                  </Text>
                  <XStack alignItems="center" style={styles.currencyInputBox}>
                    <Text fontSize={12} color={tokens.textMuted}>
                      ₹
                    </Text>
                    <TextInput
                      value={mrp}
                      onChangeText={setMrp}
                      keyboardType="numeric"
                      style={styles.currencyTextInput}
                    />
                  </XStack>
                </YStack>

                <YStack flex={1} gap={4}>
                  <Text fontSize={10} color={tokens.textMuted}>
                    Sale Price (Selling Rate):
                  </Text>
                  <XStack alignItems="center" style={styles.currencyInputBox}>
                    <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                      ₹
                    </Text>
                    <TextInput
                      value={salePrice}
                      onChangeText={setSalePrice}
                      keyboardType="numeric"
                      style={[styles.currencyTextInput, { fontWeight: '800', color: tokens.text }]}
                    />
                  </XStack>
                </YStack>
              </XStack>

              {/* Profit Margin Summary */}
              <XStack
                backgroundColor={tokens.surfaceRaised}
                borderRadius={6}
                padding={8}
                alignItems="center"
                justifyContent="space-between"
              >
                <YStack>
                  <Text fontSize={9} color={tokens.textMuted}>
                    Base Landed Cost:
                  </Text>
                  <Text fontSize={11} fontWeight="700" color={tokens.text}>
                    ₹{baseCostPrice.toLocaleString('en-IN')}
                  </Text>
                </YStack>

                <YStack alignItems="center">
                  <Text fontSize={9} color={tokens.textMuted}>
                    Discount:
                  </Text>
                  <Text fontSize={11} fontWeight="800" color="#10B981">
                    {discountPercent}% OFF
                  </Text>
                </YStack>

                <YStack alignItems="flex-end">
                  <Text fontSize={9} color={tokens.textMuted}>
                    Gross Margin:
                  </Text>
                  <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                    ₹{grossMargin.toLocaleString('en-IN')} ({marginPercent}%)
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        )}
      </ScrollView>

      {/* ── FIXED BOTTOM NAVIGATION BAR: PREV & NEXT STAGE NAMES / SAVE ── */}
      {currentScreen === 'qualify_and_group' && (
        <View style={[styles.fixedBottomBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <XStack alignItems="center" justifyContent="space-between" width="100%">
            {/* Left Button: Navigates to previous stage or Hub */}
            {currentStage === 'qualify' || (currentStage as any) === 'qualification' ? (
              <Pressable
                onPress={() => setCurrentScreen('hub')}
                style={[styles.bottomNavPrevBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
              >
                <LuChevronLeft size={15} color={tokens.text} />
                <Text fontSize={11} fontWeight="700" color={tokens.text}>
                  Store Curation
                </Text>
              </Pressable>
            ) : currentStage === 'swatches' || (currentStage as any) === 'swatch_creation' ? (
              <Pressable
                onPress={() => setCurrentStage('qualify')}
                style={[styles.bottomNavPrevBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
              >
                <LuChevronLeft size={15} color={tokens.text} />
                <Text fontSize={11} fontWeight="700" color={tokens.text}>
                  Qualify
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setCurrentStage('swatches')}
                style={[styles.bottomNavPrevBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
              >
                <LuChevronLeft size={15} color={tokens.text} />
                <Text fontSize={11} fontWeight="700" color={tokens.text}>
                  Swatches
                </Text>
              </Pressable>
            )}

            {/* Right Button: Navigates to next stage or Save in last stage */}
            {currentStage === 'qualify' || (currentStage as any) === 'qualification' ? (
              <Pressable
                onPress={() => setCurrentStage('swatches')}
                style={[styles.bottomNavNextBtn, { backgroundColor: tokens.accent }]}
              >
                <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                  Swatches
                </Text>
                <LuChevronRight size={15} color={tokens.accentForeground} />
              </Pressable>
            ) : currentStage === 'swatches' || (currentStage as any) === 'swatch_creation' ? (
              <Pressable
                onPress={() => setCurrentStage('grouping')}
                style={[styles.bottomNavNextBtn, { backgroundColor: tokens.accent }]}
              >
                <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                  Grouping
                </Text>
                <LuChevronRight size={15} color={tokens.accentForeground} />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSaveCuration}
                style={[styles.bottomNavNextBtn, { backgroundColor: '#15803D' }]}
              >
                <LuCheck size={15} color="#FFFFFF" strokeWidth={3} />
                <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                  Save
                </Text>
              </Pressable>
            )}
          </XStack>
        </View>
      )}

      {/* ── FIXED BOTTOM BAR FOR METADATA SCREEN ── */}
      {currentScreen === 'metadata' && (
        <View style={[styles.fixedBottomBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <XStack alignItems="center" justifyContent="space-between" width="100%">
            <Pressable
              onPress={() => setCurrentScreen('hub')}
              style={[styles.bottomNavPrevBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
            >
              <LuChevronLeft size={15} color={tokens.text} />
              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                Store Curation
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveCuration}
              style={[styles.bottomNavNextBtn, { backgroundColor: '#15803D' }]}
            >
              <LuCheck size={15} color="#FFFFFF" strokeWidth={3} />
              <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                Save Metadata
              </Text>
            </Pressable>
          </XStack>
        </View>
      )}

      {/* ── MODAL: COLOR ASSIGNMENT (LONG-PRESS ON SWATCH) ── */}
      <ColorAssignmentPickerModal
        visible={!!colorPickerModalGroupId && swatchTemplate !== 'multicolor'}
        colorGroup={colorGroups.find((g) => g.id === colorPickerModalGroupId) || null}
        template={colorGroups.find((g) => g.id === colorPickerModalGroupId)?.template || swatchTemplate}
        extractedColors={extractedColors}
        colorCount={colorGroups.find((g) => g.id === colorPickerModalGroupId)?.colorCount}
        onApply={(updatedGroup) => {
          setColorGroups((prev) =>
            prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
          );
        }}
        onClose={() => setColorPickerModalGroupId(null)}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  hubProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  hubProductThumb: {
    width: 60,
    height: 72,
    borderRadius: 8,
  },
  hubStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubFeatureTile: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
    cursor: 'pointer',
  },
  hubTileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTileBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubMetricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hubTileChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  bottomNavPrevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer',
  },
  bottomNavNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  topIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  timelineTrack: {
    position: 'absolute',
    top: 14,
    left: 20,
    right: 20,
    height: 2,
    zIndex: 1,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    zIndex: 2,
    cursor: 'pointer',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  mediaTile: {
    flexBasis: '32%',
    flexGrow: 1,
    maxWidth: '32.6%',
    height: 114,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    cursor: 'pointer',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileCheckbox: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 5,
  },
  tileVideoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tileOrderBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  compactSwatchSquareTile: {
    flexBasis: '32%',
    flexGrow: 1,
    maxWidth: '32.6%',
    height: 84,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 2,
    position: 'relative',
    cursor: 'pointer',
  },
  swatchTileSelectedCheck: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  compactStepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  miniRefTile: {
    flexBasis: '32%',
    flexGrow: 1,
    maxWidth: '32.6%',
    height: 114,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  swatchHeadCard: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    cursor: 'pointer',
    minWidth: 72,
  },
  commonCBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headOverlayCount: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  swatchPencilBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    cursor: 'pointer',
  },
  editColorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commonTileStar: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#D97706',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  lockedCommonBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  aiGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  descriptionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 16,
    minHeight: 60,
  },
  currencyInputBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  currencyTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    padding: 0,
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 40,
  },
  nextActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    cursor: 'pointer',
  },
  colorPickerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  // Preview specific styles
  exitPreviewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewCarousel: {
    width: '100%',
    height: 380,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  videoLiveBar: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
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
  carouselChevron: {
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
  slideCounter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commonPreviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewSwatchBtn: {
    alignItems: 'center',
    gap: 3,
    cursor: 'pointer',
  },
  discountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
