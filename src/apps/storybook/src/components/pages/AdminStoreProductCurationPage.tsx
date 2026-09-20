import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuSignal,
  LuWifi,
  LuLock,
  LuExternalLink,
} from 'react-icons/lu';
import {
  ColorAssignmentPickerModal,
  getSlotLimits,
  getInitialSlotColors,
} from '../organisms/StoreCuration/ColorAssignmentPickerModal';
import { useTheme, useResponsive, FormFactorContext } from '../../theme';
import { ProductDetailPage } from './ProductDetailPage';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  resolveColorHex,
} from '../atoms/SwatchDot/CustomSwatchDot';
import { CarouselDot } from '../atoms/CarouselDot/CarouselDot';
import { CurationHubTile } from '../molecules/CurationHubTile';
import { SizeSelector } from '../organisms/SizeSelector/SizeSelector';
import {
  LETTER_SIZE_PRESET,
  DEFAULT_SELECTED_LETTER_SIZES,
  BLOUSE_NUMERIC_PRESET,
  KIDS_SIZE_PRESET,
  CatalogTestProduct,
  ProductSizeConfig,
  SizeCategoryType,
} from '../../data/catalog';
import { SwatchItem, GalleryImage } from '../organisms/ProductGallery/ProductGallery';
import {
  StoreCurationMediaItem,
  StoreColorGroup,
  StoreProductLifecycleState,
  ProductCurationSpecs,
  DEFAULT_SAREE_SPECS,
  buildSpecsFromUnifiedAttributes,
} from '../organisms/StoreCuration/types';
import { StoreProductEnrichmentSection } from '../organisms/StoreCuration/StoreProductEnrichmentSection';
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
  product?: any;
  unified_attributes?: any;
  initialSpecs?: ProductCurationSpecs;
  onBack?: () => void;
  onSave?: (curatedPayload: any) => void;
  disableSafeArea?: boolean;
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
  initialScreen = 'hub',
  initialStage,
  initialShowPreview = false,
  initialMedia = MOCK_CURATION_MEDIA,
  initialColorGroups = INITIAL_COLOR_GROUPS,
  initialColorPickerGroupId = null,
  product,
  unified_attributes,
  initialSpecs,
  onBack,
  onSave,
  disableSafeArea = false,
}: AdminStoreProductCurationPageProps) {
  const { tokens } = useTheme();
  const { factor, isMobile, isTablet, isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const mediaTileStyle: ViewStyle = useMemo(() => {
    if (isDesktop) {
      return {
        flexBasis: '15.8%' as any,
        maxWidth: '16.2%' as any,
        height: 190,
      };
    }
    if (isTablet) {
      return {
        flexBasis: '23.8%' as any,
        maxWidth: '24.5%' as any,
        height: 160,
      };
    }
    return {
      flexBasis: '32%' as any,
      maxWidth: '32.6%' as any,
      height: 114,
    };
  }, [isDesktop, isTablet]);

  const swatchTileStyle: ViewStyle = useMemo(() => {
    if (isDesktop) {
      return {
        flexBasis: '15.8%' as any,
        maxWidth: '16.2%' as any,
        height: 96,
      };
    }
    return {
      flexBasis: '32%' as any,
      maxWidth: '32.6%' as any,
      height: 84,
    };
  }, [isDesktop]);

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
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [mediaList, setMediaList] = useState<StoreCurationMediaItem[]>(initialMedia);
  const [swatchTemplate, setSwatchTemplate] = useState<SwatchTemplateType>('contrast-border');
  const [swatchCount, setSwatchCount] = useState<number>(initialColorGroups.length || 2);
  const [colorGroups, setColorGroups] = useState<StoreColorGroup[]>(() => {
    return (initialColorGroups || []).map((g) => {
      const tpl = g.template && g.template !== 'solid' ? g.template : 'contrast-border';
      const initialSlots = getInitialSlotColors(g, tpl);
      return {
        ...g,
        template: tpl,
        slotA: initialSlots[0] || g.slotA,
        slotB: initialSlots.length > 1 ? initialSlots[1] : (g.slotB || '#D4AF37'),
        slotC: initialSlots.length > 2 ? initialSlots[2] : g.slotC,
        slotD: initialSlots.length > 3 ? initialSlots[3] : g.slotD,
        colors: initialSlots,
        colorCount: initialSlots.length,
      };
    });
  });

  // Grouping stage active selection: 'common' or specific group ID
  const [activeSwatchTab, setActiveSwatchTab] = useState<string>('common');
  const [colorPickerModalGroupId, setColorPickerModalGroupId] = useState<string | null>(initialColorPickerGroupId);

  const effectiveUa = unified_attributes || product?.unified_attributes;
  const resolvedInitialSpecs = useMemo(() => {
    if (initialSpecs) return initialSpecs;
    if (effectiveUa || fabric || title) {
      return buildSpecsFromUnifiedAttributes(
        effectiveUa,
        { title, fabric, ...product },
        DEFAULT_SAREE_SPECS
      );
    }
    return DEFAULT_SAREE_SPECS;
  }, [initialSpecs, effectiveUa, product, title, fabric]);

  // Metadata stage
  const [lifecycleState, setLifecycleState] = useState<StoreProductLifecycleState>(initialLifecycleState);
  const [description, setDescription] = useState(initialDescription);
  const [mrp, setMrp] = useState(initialMrp.toString());
  const [salePrice, setSalePrice] = useState(initialSalePrice.toString());
  const [specs, setSpecs] = useState<ProductCurationSpecs>(resolvedInitialSpecs);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  React.useEffect(() => {
    if (effectiveUa) {
      const derived = buildSpecsFromUnifiedAttributes(
        effectiveUa,
        { title, fabric, ...product },
        specs
      );
      setSpecs(derived);
    }
  }, [effectiveUa, product]);

  // Preview PDP interactive state
  const [previewActiveGroupId, setPreviewActiveGroupId] = useState<string>(
    colorGroups[0]?.id || 'cg-emerald'
  );
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [previewPlayingVideo, setPreviewPlayingVideo] = useState(false);
  const [previewBufferingVideo, setPreviewBufferingVideo] = useState(false);

  // Sync state if props update dynamically
  React.useEffect(() => {
    setMediaList(initialMedia);
  }, [initialMedia]);

  React.useEffect(() => {
    const syncedGroups = (initialColorGroups || []).map((g) => {
      const tpl = g.template && g.template !== 'solid' ? g.template : swatchTemplate;
      const initialSlots = getInitialSlotColors(g, tpl);
      return {
        ...g,
        template: tpl,
        slotA: initialSlots[0] || g.slotA,
        slotB: initialSlots.length > 1 ? initialSlots[1] : (g.slotB || '#D4AF37'),
        slotC: initialSlots.length > 2 ? initialSlots[2] : g.slotC,
        slotD: initialSlots.length > 3 ? initialSlots[3] : g.slotD,
        colors: initialSlots,
        colorCount: initialSlots.length,
      };
    });
    setColorGroups(syncedGroups);
    setSwatchCount(syncedGroups.length || 1);
    if (syncedGroups.length > 0) {
      setPreviewActiveGroupId(syncedGroups[0].id);
    }
  }, [initialColorGroups, swatchTemplate]);

  React.useEffect(() => {
    setLifecycleState(initialLifecycleState);
  }, [initialLifecycleState]);

  React.useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  React.useEffect(() => {
    setMrp(initialMrp.toString());
  }, [initialMrp]);

  React.useEffect(() => {
    setSalePrice(initialSalePrice.toString());
  }, [initialSalePrice]);

  React.useEffect(() => {
    if (colorGroups.length > 0 && !colorGroups.some((g) => g.id === previewActiveGroupId)) {
      setPreviewActiveGroupId(colorGroups[0].id);
      setPreviewSlideIndex(0);
    }
  }, [colorGroups, previewActiveGroupId]);

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

  // Horizontal scroll tracking for swatch swipe areas
  const stage2ScrollRef = useRef<ScrollView>(null);
  const stage3ScrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef<{ stage2: number; stage3: number }>({ stage2: 0, stage3: 0 });

  // Sync color groups count when stepper changes (supports up to 2 digits: 1 to 99)
  const handleSetSwatchCount = (newCount: number) => {
    if (newCount < 1 || newCount > 99) return;

    // When swatch count is reduced, compressed swipe tiles automatically glide towards the left
    // if the user had previously swiped/scrolled to the right
    if (newCount < swatchCount) {
      if (scrollOffsetRef.current.stage2 > 0) {
        stage2ScrollRef.current?.scrollTo({ x: 0, animated: true });
        scrollOffsetRef.current.stage2 = 0;
      }
      if (scrollOffsetRef.current.stage3 > 0) {
        stage3ScrollRef.current?.scrollTo({ x: 0, animated: true });
        scrollOffsetRef.current.stage3 = 0;
      }
    }

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

  // Discard a specific swatch tile and immediately reflect on swatch count & counter
  const handleDiscardSwatch = (groupId: string) => {
    if (colorGroups.length <= 1) return;

    const updated = colorGroups.filter((g) => g.id !== groupId);
    setColorGroups(updated);
    setSwatchCount(updated.length);

    if (activeSwatchTab === groupId) {
      setActiveSwatchTab('common');
    }

    if (previewActiveGroupId === groupId) {
      setPreviewActiveGroupId(updated[0]?.id || '');
    }

    setMediaList((prev) => prev.map((m) => (m.colorGroupId === groupId ? { ...m, colorGroupId: undefined } : m)));

    if (scrollOffsetRef.current.stage2 > 0) {
      stage2ScrollRef.current?.scrollTo({ x: 0, animated: true });
      scrollOffsetRef.current.stage2 = 0;
    }
    if (scrollOffsetRef.current.stage3 > 0) {
      stage3ScrollRef.current?.scrollTo({ x: 0, animated: true });
      scrollOffsetRef.current.stage3 = 0;
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
      lifecycleState,
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
    const filtered = qualifiedMedia.filter((m) => {
      if (m.isCommon) return true;
      if (m.colorGroupId && activeGroup?.id) return m.colorGroupId === activeGroup.id;
      return !m.colorGroupId || colorGroups.length <= 1;
    });
    const result = filtered.length > 0 ? filtered : qualifiedMedia;
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [qualifiedMedia, colorGroups, previewActiveGroupId]);

  React.useEffect(() => {
    if (previewSlideIndex >= previewMedia.length && previewMedia.length > 0) {
      setPreviewSlideIndex(0);
    }
  }, [previewMedia.length, previewSlideIndex]);

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
  // VIEW: PREVIEW MODE (FULL-SCREEN MULTI-DEVICE STOREFRONT PDP SIMULATION)
  // ──────────────────────────────────────────────────────────────────────────
  const adaptedCatalogProduct: CatalogTestProduct = useMemo(() => {
    const swatchesMap: Record<string, SwatchItem> = {};
    const qualified = mediaList.filter((m) => m.isQualified);

    colorGroups.forEach((cg) => {
      const assignedMedia = qualified.filter((m) => m.colorGroupId === cg.id);
      const effectiveMedia = assignedMedia.length > 0 ? assignedMedia : qualified;

      const galleryImages: GalleryImage[] = effectiveMedia.map((m) => ({
        id: m.id,
        url: m.uri,
        label: m.title || cg.name,
        isHero: m.isHero,
      }));

      swatchesMap[cg.id] = {
        label: cg.name,
        images:
          galleryImages.length > 0
            ? galleryImages
            : [
                {
                  id: `fallback-${cg.id}`,
                  gradient: [cg.slotA, cg.slotB || '#D4AF37'],
                  label: cg.name,
                },
              ],
        primaryColor: cg.slotA,
        secondaryColor: cg.slotB || '#D4AF37',
        tertiaryColor: cg.slotC,
        quaternaryColor: cg.slotD,
        colors: cg.colors,
        colorCount: cg.colorCount as 2 | 3 | 4 | undefined,
        template: cg.template,
        gradient: [cg.slotA, cg.slotB || '#D4AF37'],
      };
    });

    const isNoSize = specs.sizeProfile === 'no-size' || specs.sizeProfile === 'free-size';
    const noSizeVariant = specs.noSizeVariant || (specs.category === 'blouse' ? 'free-size' : 'one-size');
    const sizeDrapeText =
      specs.sizeDrapeText ||
      (noSizeVariant === 'free-size'
        ? 'Stitched Blouse with Free Size / Alterable Seams'
        : `${specs.sareeLengthMetres || 5.5}m Saree + ${specs.blousePieceLengthMetres || 0.8}m Unstitched Blouse Piece`);

    const sizeConfig: ProductSizeConfig = {
      type: (specs.sizeProfile || specs.sizeCategory || 'no-size') as SizeCategoryType,
      title: isNoSize ? 'Garment Size' : 'Select Size',
      customNotes: specs.customNotes,
      defaultSelected: isNoSize
        ? noSizeVariant === 'free-size' ? 'free_size' : 'one_size'
        : (specs.sizeProfile === 'kids'
            ? KIDS_SIZE_PRESET[0]?.id
            : specs.sizeProfile === 'numeric'
            ? BLOUSE_NUMERIC_PRESET[0]?.id
            : 'M'),
      options: isNoSize
        ? [
            {
              id: noSizeVariant === 'free-size' ? 'free_size' : 'one_size',
              label: noSizeVariant === 'free-size' ? 'Free Size' : 'One Size',
              subtitle: sizeDrapeText,
              badge: noSizeVariant === 'free-size' ? 'Free Size Stitched' : 'Universal Drape',
            },
          ]
        : (specs.sizeProfile === 'kids'
            ? KIDS_SIZE_PRESET
            : specs.sizeProfile === 'numeric'
            ? BLOUSE_NUMERIC_PRESET
            : LETTER_SIZE_PRESET
          ).map((opt) => ({
            ...opt,
            disabled: specs.availableSizes
              ? specs.availableSizes[opt.id] === false
              : (specs.sizeProfile === 'letter' ? !DEFAULT_SELECTED_LETTER_SIZES.includes(opt.id) : false),
          })),
    };

    const highlights = [
      specs.weaveTechniqueName,
      specs.motifPatternName,
      specs.borderPalluName,
      specs.zariMaterialName,
      specs.workHeavinessName,
      ...(specs.badges || []),
    ].filter(Boolean);

    return {
      id: productId || 'prod-curated',
      sku: productCode || 'VF2B58',
      title: title || 'Banarasi Dupion Silk Zari Saree',
      brand: 'VAANYA LUXE',
      category: specs.category || 'saree',
      categoryLabel: specs.category === 'saree' ? 'Pure Silk Sarees' : specs.category ? `${specs.category.toUpperCase()} Collection` : 'Sarees',
      price: parsedSalePrice || 10999,
      originalPrice: parsedMrp > parsedSalePrice ? parsedMrp : 14999,
      discountPercent: discountPercent,
      rating: 4.9,
      reviewCount: 142,
      inStock: initialLifecycleState !== 'sold_out' && initialLifecycleState !== 'out_of_stock',
      fabric: specs.fabricName || fabric || 'Pure Silk',
      stitchType: specs.stitchTypeName?.includes('Unstitched')
        ? 'Unstitched'
        : specs.stitchTypeName?.includes('Ready')
        ? 'Ready to Drape'
        : 'Stitched',
      weaveOrigin: specs.craftOriginName || 'Varanasi, UP',
      description: description || '',
      highlights,
      sizeConfig,
      swatches: swatchesMap,
      selectedColorDefault: colorGroups[0]?.id || 'cg-emerald',
      mediaGallery: qualified.map((m) => m.uri),
    };
  }, [
    productId,
    productCode,
    title,
    fabric,
    description,
    parsedSalePrice,
    parsedMrp,
    discountPercent,
    initialLifecycleState,
    colorGroups,
    mediaList,
    specs,
  ]);

  if (showPreview) {
    return (
      <YStack
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        width="100vw"
        height="100vh"
        backgroundColor="#070A11"
        zIndex={99999}
        overflow="hidden"
      >
        {/* Sticky External Curation Viewport Bar (Completely Outside the Device Frame) */}
        <XStack
          backgroundColor="#0F172A"
          borderBottomWidth={1}
          borderBottomColor="#1E293B"
          paddingHorizontal={16}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
          zIndex={50}
          width="100%"
          flexWrap="wrap"
          gap={10}
          shadowColor="#000000"
          shadowOpacity={0.4}
          shadowRadius={8}
        >
          {/* Left: Brand & Curated SKU Badge */}
          <XStack alignItems="center" gap={8}>
            <Text fontSize={13} fontWeight="900" color="#FFFFFF" letterSpacing={1}>
              STOREFRONT PDP PREVIEW
            </Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
              <Text fontSize={10} fontWeight="800" color="#94A3B8">
                {productCode}
              </Text>
            </View>
            <View style={{ backgroundColor: '#15803D', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
              <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                LIVE CURATION
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(51,65,85,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 }}>
              <Text fontSize={10} fontWeight="700" color="#94A3B8">
                {previewDevice === 'mobile'
                  ? '390 × 844 px · Mobile Phone'
                  : previewDevice === 'tablet'
                  ? '768 × 960 px · iPad Tablet'
                  : '1240 × 880 px · macOS Browser'}
              </Text>
            </View>
          </XStack>

          {/* Center: Device Size Switcher Controls (OUTSIDE Device Frame) */}
          <XStack alignItems="center" gap={4} backgroundColor="#1E293B" padding={3} borderRadius={8} borderWidth={1} borderColor="#334155">
            <Pressable
              onPress={() => setPreviewDevice('mobile')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: previewDevice === 'mobile' ? '#FFFFFF' : 'transparent',
              }}
            >
              <LuSmartphone size={13} color={previewDevice === 'mobile' ? '#0F172A' : '#94A3B8'} />
              <Text fontSize={11} fontWeight="800" color={previewDevice === 'mobile' ? '#0F172A' : '#94A3B8'}>
                Mobile (390px)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPreviewDevice('tablet')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: previewDevice === 'tablet' ? '#FFFFFF' : 'transparent',
              }}
            >
              <LuTablet size={13} color={previewDevice === 'tablet' ? '#0F172A' : '#94A3B8'} />
              <Text fontSize={11} fontWeight="800" color={previewDevice === 'tablet' ? '#0F172A' : '#94A3B8'}>
                Tablet (768px)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPreviewDevice('desktop')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: previewDevice === 'desktop' ? '#FFFFFF' : 'transparent',
              }}
            >
              <LuMonitor size={13} color={previewDevice === 'desktop' ? '#0F172A' : '#94A3B8'} />
              <Text fontSize={11} fontWeight="800" color={previewDevice === 'desktop' ? '#0F172A' : '#94A3B8'}>
                Desktop (Full Width)
              </Text>
            </Pressable>
          </XStack>

          {/* Right: Exit Preview Button */}
          <Pressable
            onPress={() => setShowPreview(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: '#DC2626',
            }}
          >
            <LuX size={13} color="#FFFFFF" />
            <Text fontSize={11} fontWeight="800" color="#FFFFFF">
              Exit Preview
            </Text>
          </Pressable>
        </XStack>

        {/* Viewport Canvas Stage */}
        <YStack
          flex={1}
          width="100%"
          alignItems="center"
          justifyContent="flex-start"
          overflowY="auto"
          paddingVertical={28}
          paddingHorizontal={16}
        >
          {/* ── 1. MOBILE HARDWARE FRAME (Dynamic Island & Smartphone Bezel) ── */}
          {previewDevice === 'mobile' && (
            <YStack
              width={390}
              maxWidth="100%"
              height={844}
              backgroundColor="#000000"
              borderRadius={48}
              borderWidth={10}
              borderColor="#1E293B"
              shadowColor="#000000"
              shadowOpacity={0.65}
              shadowRadius={36}
              shadowOffset={{ width: 0, height: 18 }}
              overflow="hidden"
              position="relative"
            >
              {/* Dynamic Island Status Bar */}
              <XStack
                height={44}
                backgroundColor="#000000"
                paddingHorizontal={22}
                alignItems="center"
                justifyContent="space-between"
                zIndex={30}
              >
                <Text fontSize={12} fontWeight="800" color="#FFFFFF" letterSpacing={-0.2}>
                  9:41
                </Text>
                {/* Dynamic Island Capsule */}
                <XStack
                  width={110}
                  height={26}
                  borderRadius={13}
                  backgroundColor="#0A0A0A"
                  alignItems="center"
                  justifyContent="flex-end"
                  paddingHorizontal={8}
                  gap={6}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }} />
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155' }} />
                </XStack>
                {/* Signal, WiFi, Battery */}
                <XStack alignItems="center" gap={5}>
                  <LuSignal size={12} color="#FFFFFF" />
                  <LuWifi size={12} color="#FFFFFF" />
                  <XStack width={19} height={10} borderRadius={2.5} borderWidth={1} borderColor="#FFFFFF" padding={1} alignItems="center">
                    <View style={{ width: '85%', height: '100%', borderRadius: 1.5, backgroundColor: '#10B981' }} />
                  </XStack>
                </XStack>
              </XStack>

              {/* Screen Viewport */}
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <FormFactorContext.Provider
                  value={{
                    factor: 'mobile',
                    isMobile: true,
                    isTablet: false,
                    isDesktop: false,
                    containerWidth: 390,
                  }}
                >
                  <ProductDetailPage
                    product={adaptedCatalogProduct}
                    curatedSpecs={specs}
                    onNavigateHome={() => setShowPreview(false)}
                    onNavigateCatalog={() => setShowPreview(false)}
                  />
                </FormFactorContext.Provider>
              </View>

              {/* Bottom Home Indicator */}
              <XStack height={20} backgroundColor="#FFFFFF" alignItems="center" justifyContent="center" zIndex={30}>
                <View style={{ width: 134, height: 4, borderRadius: 2, backgroundColor: '#0F172A' }} />
              </XStack>
            </YStack>
          )}

          {/* ── 2. TABLET HARDWARE FRAME (iPad Bezel with Camera Dot) ── */}
          {previewDevice === 'tablet' && (
            <YStack
              width={768}
              maxWidth="100%"
              height={960}
              backgroundColor="#000000"
              borderRadius={32}
              borderWidth={14}
              borderColor="#1E293B"
              shadowColor="#000000"
              shadowOpacity={0.6}
              shadowRadius={36}
              shadowOffset={{ width: 0, height: 18 }}
              overflow="hidden"
              position="relative"
            >
              {/* Tablet Top Bezel with Camera */}
              <XStack
                height={34}
                backgroundColor="#0F172A"
                paddingHorizontal={20}
                alignItems="center"
                justifyContent="space-between"
                zIndex={30}
              >
                <Text fontSize={11} fontWeight="700" color="#94A3B8">
                  9:41 AM  Mon Sep 19
                </Text>
                {/* Center Bezel Camera Lens */}
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' }} />
                <XStack alignItems="center" gap={6}>
                  <LuWifi size={12} color="#94A3B8" />
                  <Text fontSize={10} fontWeight="700" color="#94A3B8">100%</Text>
                  <XStack width={18} height={9} borderRadius={2.5} borderWidth={1} borderColor="#94A3B8" padding={1} alignItems="center">
                    <View style={{ width: '100%', height: '100%', borderRadius: 1, backgroundColor: '#10B981' }} />
                  </XStack>
                </XStack>
              </XStack>

              {/* Screen Viewport */}
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <FormFactorContext.Provider
                  value={{
                    factor: 'tablet',
                    isMobile: false,
                    isTablet: true,
                    isDesktop: false,
                    containerWidth: 768,
                  }}
                >
                  <ProductDetailPage
                    product={adaptedCatalogProduct}
                    curatedSpecs={specs}
                    onNavigateHome={() => setShowPreview(false)}
                    onNavigateCatalog={() => setShowPreview(false)}
                  />
                </FormFactorContext.Provider>
              </View>

              {/* Bottom Tablet Home Indicator */}
              <XStack height={16} backgroundColor="#FFFFFF" alignItems="center" justifyContent="center" zIndex={30}>
                <View style={{ width: 180, height: 4, borderRadius: 2, backgroundColor: '#0F172A' }} />
              </XStack>
            </YStack>
          )}

          {/* ── 3. DESKTOP HARDWARE FRAME (macOS Browser Window Frame) ── */}
          {previewDevice === 'desktop' && (
            <YStack
              width="100%"
              maxWidth={1240}
              height={880}
              backgroundColor="#0F172A"
              borderRadius={14}
              borderWidth={1}
              borderColor="#334155"
              shadowColor="#000000"
              shadowOpacity={0.65}
              shadowRadius={40}
              shadowOffset={{ width: 0, height: 20 }}
              overflow="hidden"
              position="relative"
            >
              {/* macOS Browser Header Chrome */}
              <XStack
                height={42}
                backgroundColor="#1E293B"
                borderBottomWidth={1}
                borderBottomColor="#334155"
                paddingHorizontal={14}
                alignItems="center"
                justifyContent="space-between"
                zIndex={30}
                gap={12}
              >
                {/* Traffic Lights */}
                <XStack alignItems="center" gap={7}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' }} />
                </XStack>

                {/* Address Bar */}
                <XStack
                  flex={1}
                  maxWidth={540}
                  height={28}
                  backgroundColor="#0F172A"
                  borderRadius={6}
                  borderWidth={1}
                  borderColor="#334155"
                  paddingHorizontal={10}
                  alignItems="center"
                  justifyContent="center"
                  gap={6}
                >
                  <LuLock size={11} color="#10B981" />
                  <Text fontSize={11} color="#94A3B8" fontFamily="monospace">
                    https://store.vayyari.com/p/{productCode}
                  </Text>
                </XStack>

                {/* Right: External Link */}
                <XStack alignItems="center" gap={8}>
                  <View style={{ padding: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <LuExternalLink size={12} color="#94A3B8" />
                  </View>
                </XStack>
              </XStack>

              {/* Screen Viewport */}
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <FormFactorContext.Provider
                  value={{
                    factor: 'desktop',
                    isMobile: false,
                    isTablet: false,
                    isDesktop: true,
                    containerWidth: 1240,
                  }}
                >
                  <ProductDetailPage
                    product={adaptedCatalogProduct}
                    curatedSpecs={specs}
                    onNavigateHome={() => setShowPreview(false)}
                    onNavigateCatalog={() => setShowPreview(false)}
                  />
                </FormFactorContext.Provider>
              </View>
            </YStack>
          )}
        </YStack>
      </YStack>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: MAIN PROGRESSIVE CURATION WORKBENCH (RESPONSIVE MULTI-FORM FACTOR)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={isMobile ? '100%' : isTablet ? 768 : 1240}
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
        paddingHorizontal={isMobile ? 10 : isTablet ? 20 : 28}
        paddingTop={topInset + 8}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={isMobile ? 8 : 12} flex={1}>
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
            <XStack alignItems="center" gap={6} flexWrap="wrap">
              <LuStore size={isMobile ? 15 : 18} color={tokens.accent} />
              <Text fontSize={isMobile ? 15 : 18} fontWeight="900" color={tokens.text} numberOfLines={1}>
                {currentScreen === 'hub'
                  ? 'Store Curation'
                  : currentScreen === 'qualify_and_group'
                  ? 'Qualify & Group'
                  : 'Product Metadata'}
              </Text>
              {!isMobile && (
                <View style={[styles.codePill, { backgroundColor: `${tokens.accent}14`, marginLeft: 4 }]}>
                  <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                    {productCode}
                  </Text>
                </View>
              )}
            </XStack>
            <Text fontSize={isMobile ? 10 : 12} color={tokens.textMuted} numberOfLines={1}>
              {currentScreen === 'hub'
                ? `${productCode} · ${title} · ${fabric}`
                : currentScreen === 'qualify_and_group'
                ? `Stage ${currentStageIndex + 1} of 3 · ${productCode} · ${title}`
                : `Story, AI & Commercial Margins · ${productCode} · ${title}`}
            </Text>
          </YStack>
        </XStack>

        {/* Top-Right Actions: Preview & Save */}
        <XStack alignItems="center" gap={8}>
          <Pressable
            onPress={() => setShowPreview(true)}
            hitSlop={6}
            style={[
              isMobile ? styles.topIconBtn : styles.topActionBtn,
              { backgroundColor: `${tokens.accent}14`, borderColor: tokens.accent },
            ]}
            accessibilityLabel="Live PDP Preview"
          >
            <LuEye size={16} color={tokens.accent} />
            {!isMobile && (
              <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                Storefront PDP Preview
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSaveCuration}
            hitSlop={6}
            style={[
              isMobile ? styles.topIconBtn : styles.topActionBtn,
              { backgroundColor: tokens.accent, borderColor: tokens.accent },
            ]}
            accessibilityLabel="Save Curation"
          >
            <LuSave size={16} color={tokens.accentForeground} />
            {!isMobile && (
              <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                Save Curation
              </Text>
            )}
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
        <YStack
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          paddingVertical={10}
          paddingHorizontal={isMobile ? 12 : 24}
        >
          <XStack
            alignItems="center"
            justifyContent="space-between"
            position="relative"
            maxWidth={isMobile ? '100%' : 640}
            width="100%"
            alignSelf="center"
          >
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: currentScreen === 'metadata' ? (isMobile ? 0 : isTablet ? 8 : 16) : (isMobile ? 12 : isTablet ? 20 : 28),
          paddingTop: isMobile ? 8 : 14,
          paddingBottom: currentScreen === 'hub' ? Math.max(bottomInset + 16, 24) : 90 + bottomInset,
        }}
      >
        {/* =========================================================================
            STAGE 1: MEDIA QUALIFICATION (3 TILES PER ROW, VERTICAL SCROLL)
           ========================================================================= */}
        {/* =========================================================================
            STORE CURATION HUB: 2 PROMINENT SELECTION TILES (QUALIFY & GROUP / METADATA)
           ========================================================================= */}
        {currentScreen === 'hub' && (
          <YStack gap={isMobile ? 14 : 20}>
            {/* Product Overview Card */}
            <View style={[styles.hubProductCard, !isMobile && styles.hubProductCardWide]}>
              <XStack alignItems="center" gap={isMobile ? 12 : 18}>
                <Image
                  source={{ uri: mediaList[0]?.thumbnailUri || mediaList[0]?.uri }}
                  style={isMobile ? styles.hubProductThumb : isTablet ? styles.hubProductThumbTablet : styles.hubProductThumbDesktop}
                  resizeMode="cover"
                />
                <YStack flex={1} gap={isMobile ? 2 : 4}>
                  <XStack alignItems="center" gap={6} flexWrap="wrap">
                    <Text fontSize={isMobile ? 10 : 12} fontWeight="800" color={tokens.accent} textTransform="uppercase">
                      {productCode} · {fabric}
                    </Text>
                    <View style={[styles.hubStatusPill, { backgroundColor: '#DCFCE7' }]}>
                      <Text fontSize={isMobile ? 9 : 11} fontWeight="800" color="#15803D">
                        {lifecycleState.toUpperCase()}
                      </Text>
                    </View>
                  </XStack>
                  <Text fontSize={isMobile ? 14 : isTablet ? 17 : 20} fontWeight="900" color={tokens.text} numberOfLines={isMobile ? 1 : 2}>
                    {title}
                  </Text>
                  {!isMobile && description && (
                    <Text fontSize={12} color={tokens.textMuted} numberOfLines={2} marginTop={2} lineHeight={16}>
                      {description}
                    </Text>
                  )}
                  <XStack alignItems="center" gap={isMobile ? 6 : 12} marginTop={isMobile ? 4 : 8} flexWrap="wrap">
                    <Text fontSize={isMobile ? 11 : 13} fontWeight="700" color={tokens.text}>
                      Sale: <Text fontWeight="900" color="#15803D">₹{Number(salePrice).toLocaleString('en-IN')}</Text>
                    </Text>
                    <Text fontSize={isMobile ? 10 : 12} color={tokens.textMuted} style={{ textDecorationLine: 'line-through' } as any}>
                      MRP: ₹{Number(mrp).toLocaleString('en-IN')}
                    </Text>
                    <Text fontSize={isMobile ? 10 : 12} color={tokens.textMuted}>
                      Landed Cost: ₹{baseCostPrice.toLocaleString('en-IN')}
                    </Text>
                    <View style={[styles.hubStatusPill, { backgroundColor: '#EFF6FF' }]}>
                      <Text fontSize={isMobile ? 9 : 11} fontWeight="800" color="#2563EB">
                        Margin: ₹{(Number(salePrice) - baseCostPrice).toLocaleString('en-IN')} ({Math.round(((Number(salePrice) - baseCostPrice) / Number(salePrice)) * 100)}%)
                      </Text>
                    </View>
                  </XStack>
                </YStack>
              </XStack>
            </View>

            <Text fontSize={isMobile ? 11 : 13} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
              Curation Sections
            </Text>

            {/* 2-Column Responsive Curation Tiles: Qualify & Group + Metadata */}
            <XStack gap={isMobile ? 10 : 16} alignItems="stretch">
              {/* Tile 1: Qualify & Group */}
              <CurationHubTile
                title="Qualify & Group"
                icon={<LuLayers size={isMobile ? 16 : 22} color={tokens.accent} />}
                iconBg={`${tokens.accent}14`}
                minHeight={isMobile ? 84 : isTablet ? 104 : 120}
                metrics={[
                  {
                    icon: <LuImage size={isMobile ? 11 : 14} color={tokens.accent} />,
                    label: isMobile ? qualifiedMedia.length : `${qualifiedMedia.length} Qualified Media`,
                    fontWeight: '800',
                    fontSize: isMobile ? 11 : 13,
                  },
                  {
                    icon: (
                      <CustomSwatchDot
                        template={swatchTemplate}
                        primaryColor={colorGroups[0]?.slotA || '#E91E63'}
                        secondaryColor={colorGroups[0]?.slotB || '#7A2E8C'}
                        tertiaryColor={colorGroups[0]?.slotC}
                        quaternaryColor={colorGroups[0]?.slotD}
                        colors={colorGroups[0]?.colors}
                        colorCount={colorGroups[0]?.colorCount as any}
                        size={isMobile ? 11 : 14}
                      />
                    ),
                    label: isMobile ? swatchCount : `${swatchCount} Color Swatches`,
                    fontWeight: '800',
                    fontSize: isMobile ? 11 : 13,
                  },
                  ...(!isMobile ? [{
                    icon: <LuVideo size={13} color="#64748B" />,
                    label: `${mediaList.filter((m) => m.mediaType === 'video').length} Videos`,
                    fontWeight: '700' as const,
                    fontSize: 12,
                    color: '#64748B',
                  }] : []),
                ]}
                onPress={() => {
                  setCurrentScreen('qualify_and_group');
                  setCurrentStage('qualify');
                }}
              />

              {/* Tile 2: Metadata */}
              <CurationHubTile
                title={isMobile ? "Metadata" : "Product Metadata & Specs"}
                icon={<LuFileText size={isMobile ? 16 : 22} color="#16A34A" />}
                iconBg="#F0FDF4"
                minHeight={isMobile ? 84 : isTablet ? 104 : 120}
                metrics={[
                  {
                    label: `₹${Number(salePrice).toLocaleString('en-IN')}`,
                    fontWeight: '800',
                    color: tokens.text,
                    fontSize: isMobile ? 11 : 13,
                  },
                  {
                    label: `${discountPercent}% OFF`,
                    fontWeight: '800',
                    color: '#16A34A',
                    fontSize: isMobile ? 11 : 13,
                  },
                  ...(!isMobile ? [{
                    label: `Sizing: ${specs.sizeCategory === 'no-size' ? (specs.noSizeVariant === 'one-size' ? 'One Size' : 'Free Size') : (specs.sizeCategory ? specs.sizeCategory.toUpperCase() : 'STANDARD')}`,
                    fontWeight: '700' as const,
                    color: tokens.textMuted,
                    fontSize: 12,
                  }] : []),
                ]}
                onPress={() => setCurrentScreen('metadata')}
              />
            </XStack>
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

            {/* Media Qualification Grid - Responsive Multi-Column */}
            <XStack
              flexWrap="wrap"
              gap={isMobile ? 4 : 8}
              justifyContent={isDesktop ? 'flex-start' : 'space-between'}
              marginHorizontal={isMobile ? -12 : 0}
              paddingHorizontal={isMobile ? 4 : 0}
            >
              {mediaList.map((item) => {
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleQualifyMedia(item.id)}
                    style={[
                      styles.mediaTile,
                      mediaTileStyle,
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
            {/* Swatch Template Tiles + Stepper: 2 Rows of 3 on Mobile/Tablet, 1 Row of 6 on Desktop */}
            <XStack
              flexWrap="wrap"
              gap={isMobile ? 4 : 8}
              justifyContent={isDesktop ? 'flex-start' : 'space-between'}
              marginHorizontal={isMobile ? -12 : 0}
              paddingHorizontal={isMobile ? 4 : 0}
            >
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = swatchTemplate === tpl.id;
                return (
                  <Pressable
                    key={tpl.id}
                    onPress={() => {
                      setSwatchTemplate(tpl.id);
                      setColorGroups((prev) =>
                        prev.map((g) => {
                          const initialSlots = getInitialSlotColors(g, tpl.id);
                          return {
                            ...g,
                            template: tpl.id,
                            slotA: initialSlots[0] || g.slotA,
                            slotB: initialSlots.length > 1 ? initialSlots[1] : undefined,
                            slotC: initialSlots.length > 2 ? initialSlots[2] : undefined,
                            slotD: initialSlots.length > 3 ? initialSlots[3] : undefined,
                            colors: initialSlots,
                            colorCount: initialSlots.length,
                          };
                        })
                      );
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.compactSwatchSquareTile,
                      swatchTileStyle,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 2 : 1,
                        opacity: pressed ? 0.75 : 1,
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
                  swatchTileStyle,
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

            {/* Configured Swatches Preview & Customization (Tap or Long-Press to Edit Colors) */}
            <YStack gap={8} marginTop={4}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  Configured Swatches ({swatchCount}):
                </Text>
                <Text fontSize={10} color={tokens.accent} fontWeight="700">
                  Tap or long-press to customize colors
                </Text>
              </XStack>

              <ScrollView
                ref={stage2ScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={(e) => {
                  scrollOffsetRef.current.stage2 = e.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                  // As tiles compress when swatch count reduces, glide towards left if swiped right
                  if (scrollOffsetRef.current.stage2 > 0) {
                    stage2ScrollRef.current?.scrollTo({ x: 0, animated: true });
                    scrollOffsetRef.current.stage2 = 0;
                  }
                }}
                contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: isMobile ? 4 : 0 }}
                style={{ marginHorizontal: isMobile ? -12 : 0 }}
              >
                {colorGroups.slice(0, swatchCount).map((cg, idx) => {
                  return (
                    <Pressable
                      key={`stage2-${cg.id}`}
                      onPress={() => {
                        if (swatchTemplate !== 'multicolor') {
                          setColorPickerModalGroupId(cg.id);
                        }
                      }}
                      onLongPress={() => {
                        if (swatchTemplate !== 'multicolor') {
                          setColorPickerModalGroupId(cg.id);
                        }
                      }}
                      delayLongPress={250}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.stage2SwatchCard,
                        {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      {/* Small X button on top right to discard tile and reflect on counter */}
                      {swatchCount > 1 && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleDiscardSwatch(cg.id);
                          }}
                          hitSlop={8}
                          style={({ pressed: xPressed }) => [
                            styles.discardSwatchBtn,
                            {
                              backgroundColor: xPressed ? '#EF4444' : '#DC2626',
                            },
                          ]}
                          accessibilityLabel="Remove swatch"
                        >
                          <LuX size={10} color="#FFFFFF" strokeWidth={3} />
                        </Pressable>
                      )}

                      {/* Dot with subtle edit indicator */}
                      <View style={styles.swatchDotWrapper}>
                        <CustomSwatchDot
                          template={swatchTemplate}
                          primaryColor={cg.slotA}
                          secondaryColor={cg.slotB || '#D4AF37'}
                          tertiaryColor={cg.slotC}
                          quaternaryColor={cg.slotD}
                          colors={cg.colors}
                          colorCount={cg.colorCount as any}
                          size={38}
                        />
                        {swatchTemplate !== 'multicolor' && (
                          <View
                            style={[
                              styles.swatchEditBadge,
                              { backgroundColor: tokens.accent, borderColor: tokens.surface },
                            ]}
                          >
                            <LuPencil size={8} color={tokens.accentForeground} />
                          </View>
                        )}
                      </View>

                      <Text fontSize={10} fontWeight="800" color={tokens.text} numberOfLines={1}>
                        {cg.name.split(' ')[0]} #{idx + 1}
                      </Text>

                      {swatchTemplate !== 'multicolor' && (
                        <View style={[styles.editBadgePill, { backgroundColor: `${tokens.accent}14` }]}>
                          <Text fontSize={8} fontWeight="800" color={tokens.accent}>
                            EDIT
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

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

              <XStack
                flexWrap="wrap"
                gap={isMobile ? 4 : 8}
                justifyContent={isDesktop ? 'flex-start' : 'space-between'}
                marginHorizontal={isMobile ? -12 : 0}
                paddingHorizontal={isMobile ? 4 : 0}
              >
                {qualifiedMedia.map((m) => (
                  <View key={m.id} style={[styles.miniRefTile, mediaTileStyle]}>
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
            <ScrollView
              ref={stage3ScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={(e) => {
                scrollOffsetRef.current.stage3 = e.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                // As tiles compress when swatch count reduces, glide towards left if swiped right
                if (scrollOffsetRef.current.stage3 > 0) {
                  stage3ScrollRef.current?.scrollTo({ x: 0, animated: true });
                  scrollOffsetRef.current.stage3 = 0;
                }
              }}
              contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: isMobile ? 4 : 0 }}
              style={{ marginHorizontal: isMobile ? -12 : 0 }}
            >
              {/* Head 0: Default Common Swatch [C] */}
              <Pressable
                onPress={() => setActiveSwatchTab('common')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.swatchHeadCard,
                  {
                    backgroundColor: activeSwatchTab === 'common' ? '#FEF3C7' : tokens.surface,
                    borderColor: activeSwatchTab === 'common' ? '#D97706' : tokens.border,
                    borderWidth: activeSwatchTab === 'common' ? 2 : 1,
                    opacity: pressed ? 0.75 : 1,
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
                    delayLongPress={250}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.swatchHeadCard,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 2 : 1,
                        opacity: pressed ? 0.75 : 1,
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
                            e.stopPropagation?.();
                            setColorPickerModalGroupId(cg.id);
                          }}
                          hitSlop={8}
                          style={styles.swatchPencilBtn}
                          accessibilityLabel="Edit colors"
                        >
                          <LuPencil size={9} color={tokens.accent} />
                        </Pressable>
                      )}
                    </XStack>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Media Assignment Grid - Responsive Multi-Column */}
            <XStack
              flexWrap="wrap"
              gap={isMobile ? 4 : 8}
              justifyContent={isDesktop ? 'flex-start' : 'space-between'}
              marginHorizontal={isMobile ? -12 : 0}
              paddingHorizontal={isMobile ? 4 : 0}
            >
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
                      mediaTileStyle,
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
            <StoreProductEnrichmentSection
              title={title}
              fabric={specs.fabricName}
              description={description}
              baseCostPrice={baseCostPrice}
              mrp={mrp}
              salePrice={salePrice}
              specs={specs}
              product={product}
              unified_attributes={effectiveUa}
              onChangeDescription={setDescription}
              onChangeMrp={setMrp}
              onChangeSalePrice={setSalePrice}
              onChangeSpecs={setSpecs}
            />
          </YStack>
        )}
      </ScrollView>

      {/* ── FIXED BOTTOM NAVIGATION BAR: PREV & NEXT STAGE NAMES / SAVE ── */}
      {currentScreen === 'qualify_and_group' && (
        <View
          style={[
            styles.fixedBottomBar,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              paddingBottom: Math.max(bottomInset, 12),
              paddingHorizontal: isMobile ? 14 : isTablet ? 20 : 28,
            },
          ]}
        >
          <XStack alignItems="center" justifyContent="space-between" width="100%">
            {/* Left Action: Navigates to previous stage or Hub */}
            {currentStage === 'qualify' || (currentStage as any) === 'qualification' ? (
              <Pressable
                onPress={() => setCurrentScreen('hub')}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <LuChevronLeft size={22} color={tokens.textMuted} strokeWidth={2.5} />
                <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                  Store Curation
                </Text>
              </Pressable>
            ) : currentStage === 'swatches' || (currentStage as any) === 'swatch_creation' ? (
              <Pressable
                onPress={() => setCurrentStage('qualify')}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <LuChevronLeft size={22} color={tokens.textMuted} strokeWidth={2.5} />
                <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                  Qualify
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setCurrentStage('swatches')}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <LuChevronLeft size={22} color={tokens.textMuted} strokeWidth={2.5} />
                <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                  Swatches
                </Text>
              </Pressable>
            )}

            {/* Right Action: Navigates to next stage or Save in last stage */}
            {currentStage === 'qualify' || (currentStage as any) === 'qualification' ? (
              <Pressable
                onPress={() => setCurrentStage('swatches')}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text fontSize={15} fontWeight="800" color={tokens.accent}>
                  Swatches
                </Text>
                <LuChevronRight size={22} color={tokens.accent} strokeWidth={2.5} />
              </Pressable>
            ) : currentStage === 'swatches' || (currentStage as any) === 'swatch_creation' ? (
              <Pressable
                onPress={() => setCurrentStage('grouping')}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text fontSize={15} fontWeight="800" color={tokens.accent}>
                  Grouping
                </Text>
                <LuChevronRight size={22} color={tokens.accent} strokeWidth={2.5} />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSaveCuration}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomNavTextLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text fontSize={15} fontWeight="800" color="#15803D">
                  Save
                </Text>
                <LuCheck size={20} color="#15803D" strokeWidth={3} />
              </Pressable>
            )}
          </XStack>
        </View>
      )}

      {/* ── FIXED BOTTOM BAR FOR METADATA SCREEN ── */}
      {currentScreen === 'metadata' && (
        <View
          style={[
            styles.fixedBottomBar,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              paddingBottom: Math.max(bottomInset, 12),
              paddingHorizontal: isMobile ? 14 : isTablet ? 20 : 28,
            },
          ]}
        >
          <XStack alignItems="center" justifyContent="space-between" width="100%">
            <Pressable
              onPress={() => setCurrentScreen('hub')}
              hitSlop={12}
              style={({ pressed }) => [
                styles.bottomNavTextLink,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <LuChevronLeft size={22} color={tokens.textMuted} strokeWidth={2.5} />
              <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                Store Curation
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveCuration}
              hitSlop={12}
              style={({ pressed }) => [
                styles.bottomNavTextLink,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text fontSize={15} fontWeight="800" color="#15803D">
                Save Metadata
              </Text>
              <LuCheck size={20} color="#15803D" strokeWidth={3} />
            </Pressable>
          </XStack>
        </View>
      )}

      {/* ── MODAL: COLOR ASSIGNMENT (LONG-PRESS ON SWATCH) ── */}
      <ColorAssignmentPickerModal
        visible={!!colorPickerModalGroupId && swatchTemplate !== 'multicolor'}
        colorGroup={colorGroups.find((g) => g.id === colorPickerModalGroupId) || null}
        template={swatchTemplate}
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
  hubProductCardWide: {
    padding: 18,
    borderRadius: 14,
  },
  hubProductThumb: {
    width: 60,
    height: 72,
    borderRadius: 8,
  },
  hubProductThumbTablet: {
    width: 80,
    height: 96,
    borderRadius: 10,
  },
  hubProductThumbDesktop: {
    width: 96,
    height: 116,
    borderRadius: 12,
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer',
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
  bottomNavTextLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
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
  stage2SwatchCard: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 84,
    position: 'relative',
  },
  discardSwatchBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  swatchDotWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
    elevation: 3,
  },
  editBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    gap: 6,
  },
  currencyTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1E293B',
    padding: 0,
    outlineStyle: 'none' as any,
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
