import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  BackHandler,
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
  LuShield,
  LuShare2,
  LuHeart,
  LuChevronLeft,
  LuChevronUp,
  LuChevronDown,
  LuPencil,
  LuTag,
  LuBell,
  LuBox,
  LuSlidersHorizontal,
  LuRotateCcw,
  LuRotateCw,
  LuCrop,
  LuTrash2,
  LuSliders,
  LuInstagram,
} from '../icons/lu';
import {
  ColorAssignmentPickerModal,
  getSlotLimits,
  getInitialSlotColors,
} from '../organisms/StoreCuration/ColorAssignmentPickerModal';
import { discardColorGroup } from '@/utils/swatchRules';
import { unlinkDiscardedMedia } from '@/utils/curationMediaRules';
import { useTheme, sharedTokens, useResponsiveLayout } from '@/theme';
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
  StoreSkuItem,
} from '../organisms/StoreCuration/types';
import {
  INITIAL_COLOR_GROUPS,
  MOCK_CURATION_MEDIA,
} from '../organisms/StoreCuration/mockCurationData';
import { MediaEditorModal } from '../organisms/StoreCuration/MediaEditorModal';
import { MediaDualCardStackModal } from '../organisms/StoreCuration/MediaDualCardStackModal';
import {
  TransformRecipe,
  DEFAULT_RECIPE,
  getLensProofPreset,
  loadHtmlImage,
  renderCanvasTransform,
  canvasToBlob,
  computeCoverCrop,
} from '@/utils/MediaCanvasEngine';
import { storeAdminService, normalizeMediaUrl } from '@/services/storeAdminService';
import { getMediaDisplayUri } from '@/utils/curationMediaRules';
export { getMediaDisplayUri };

export type CurationScreen = 'hub' | 'qualify_and_group' | 'metadata' | 'manage_skus' | 'anti_lens_studio';
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
  disableSafeArea?: boolean;
  isAlreadyInStore?: boolean;
  initialSkus?: StoreSkuItem[];
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
  onBack,
  onSave,
  disableSafeArea = false,
  isAlreadyInStore = true,
  initialSkus,
}: AdminStoreProductCurationPageProps) {
  const { tokens } = useTheme();
  const {
    isMobile,
    isTablet,
    isDesktop,
    containerMaxWidth,
    pagePaddingHorizontal,
    pagePaddingVertical,
    cardPadding,
    modalMaxWidth,
  } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

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
  const [mediaList, setMediaList] = useState<StoreCurationMediaItem[]>(() => {
    return (initialMedia || []).map((m) => ({
      ...m,
      uri: normalizeMediaUrl(m.uri),
      thumbnailUri: normalizeMediaUrl(m.thumbnailUri || m.uri),
      originalUri: m.originalUri ? normalizeMediaUrl(m.originalUri) : normalizeMediaUrl(m.uri),
      modifiedUri: m.modifiedUri ? normalizeMediaUrl(m.modifiedUri) : null,
    }));
  });

  useEffect(() => {
    if (initialMedia && initialMedia.length > 0) {
      setMediaList(
        initialMedia.map((m) => ({
          ...m,
          uri: normalizeMediaUrl(m.uri),
          thumbnailUri: normalizeMediaUrl(m.thumbnailUri || m.uri),
          originalUri: m.originalUri ? normalizeMediaUrl(m.originalUri) : normalizeMediaUrl(m.uri),
          modifiedUri: m.modifiedUri ? normalizeMediaUrl(m.modifiedUri) : null,
        }))
      );
    }
  }, [initialMedia]);

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

  // ── ITEM-LEVEL SKU MANAGEMENT STATE ──
  const [skuList, setSkuList] = useState<StoreSkuItem[]>(() => {
    if (initialSkus && initialSkus.length > 0) {
      return initialSkus;
    }
    const groups = initialColorGroups && initialColorGroups.length > 0 ? initialColorGroups : INITIAL_COLOR_GROUPS;
    return groups.map((g, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const assignedMedia = (initialMedia || []).find((m) => m.colorGroupId === g.id);
      const thumb = getMediaDisplayUri(assignedMedia) || getMediaDisplayUri(initialMedia?.[0]);
      const customPrice = (g as any).price ?? null;
      const customMrp = (g as any).mrp ?? null;
      return {
        id: g.id || `sku-${productCode.toLowerCase()}-${num}`,
        skuCode: g.colorwayCode || `${productCode}${num}`,
        colorwayName: g.name || `Colorway ${idx + 1}`,
        colorHex: g.slotA || (g.colors && g.colors[0]) || '#1B4D3E',
        secondaryHex: g.slotB || (g.colors && g.colors[1]) || '#D4AF37',
        colorGroupId: g.id,
        price: customPrice,
        mrp: customMrp,
        isPriceInherited: customPrice == null,
        stockQuantity: (g as any).stockQuantity ?? (idx === 0 ? 12 : 6),
        allowWaitlist: (g as any).allowWaitlist !== false,
        customMessage: (g as any).customMessage ?? (idx === 0 ? '✨ Pure Zari Weave · Varanasi Loom' : '⏳ Limited Artisan Run'),
        thumbnailUrl: thumb,
      };
    });
  });

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

  // SKU Management Handlers
  const handleToggleSkuPriceInheritance = (skuId: string) => {
    setSkuList((prev) =>
      prev.map((s) => {
        if (s.id !== skuId) return s;
        const newInherited = !s.isPriceInherited;
        return {
          ...s,
          isPriceInherited: newInherited,
          price: newInherited ? null : Number(salePrice) || initialSalePrice,
          mrp: newInherited ? null : Number(mrp) || initialMrp,
        };
      })
    );
  };

  const handleUpdateSkuPrice = (skuId: string, newPriceText: string) => {
    const val = Number(newPriceText.replace(/[^0-9]/g, ''));
    setSkuList((prev) =>
      prev.map((s) => (s.id === skuId ? { ...s, price: val, isPriceInherited: false } : s))
    );
  };

  const handleUpdateSkuMrp = (skuId: string, newMrpText: string) => {
    const val = Number(newMrpText.replace(/[^0-9]/g, ''));
    setSkuList((prev) =>
      prev.map((s) => (s.id === skuId ? { ...s, mrp: val, isPriceInherited: false } : s))
    );
  };

  const handleUpdateSkuStock = (skuId: string, newQty: number) => {
    const qty = Math.max(0, newQty);
    setSkuList((prev) =>
      prev.map((s) => (s.id === skuId ? { ...s, stockQuantity: qty } : s))
    );
  };

  const handleToggleSkuWaitlist = (skuId: string) => {
    setSkuList((prev) =>
      prev.map((s) => (s.id === skuId ? { ...s, allowWaitlist: !s.allowWaitlist } : s))
    );
  };

  const handleUpdateSkuCustomMessage = (skuId: string, message: string) => {
    setSkuList((prev) =>
      prev.map((s) => (s.id === skuId ? { ...s, customMessage: message } : s))
    );
  };

  // Preview PDP interactive state
  const [previewActiveGroupId, setPreviewActiveGroupId] = useState<string>(
    colorGroups[0]?.id || 'cg-emerald'
  );
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [previewPlayingVideo, setPreviewPlayingVideo] = useState(false);
  const [previewBufferingVideo, setPreviewBufferingVideo] = useState(false);

  // ── ANTI-LENS MEDIA STUDIO STATE ──
  const [activeStackMedia, setActiveStackMedia] = useState<StoreCurationMediaItem | null>(null);
  const [selectedStudioMediaId, setSelectedStudioMediaId] = useState<string | null>(null);
  const [studioRecipe, setStudioRecipe] = useState<TransformRecipe>(DEFAULT_RECIPE);
  const [studioActiveTab, setStudioActiveTab] = useState<'transform' | 'watermark' | 'presets'>('transform');
  const [savingStudio, setSavingStudio] = useState(false);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [canvasPreviewDataUrl, setCanvasPreviewDataUrl] = useState<string | null>(null);
  const [studioPanOffset, setStudioPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [studioZoomScale, setStudioZoomScale] = useState<number>(1.0);
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 1000 });

  const activeStudioMedia = useMemo(() => {
    if (selectedStudioMediaId) {
      return mediaList.find((m) => m.id === selectedStudioMediaId) || null;
    }
    const firstImg = mediaList.find((m) => m.mediaType !== 'video');
    return firstImg || null;
  }, [mediaList, selectedStudioMediaId]);

  // Load source image and initialize recipe when active studio item changes
  useEffect(() => {
    if (currentScreen !== 'anti_lens_studio' || !activeStudioMedia) {
      setSourceImg(null);
      setCanvasPreviewDataUrl(null);
      setStudioPanOffset({ x: 0, y: 0 });
      setStudioZoomScale(1.0);
      return;
    }

    if (activeStudioMedia.transformRecipe && typeof activeStudioMedia.transformRecipe === 'object') {
      setStudioRecipe({ ...DEFAULT_RECIPE, ...activeStudioMedia.transformRecipe });
    } else {
      setStudioRecipe({
        ...DEFAULT_RECIPE,
        watermark: {
          ...DEFAULT_RECIPE.watermark!,
          text: 'VAYYARI',
        },
      });
    }

    const imgUrl = activeStudioMedia.originalUri || activeStudioMedia.uri;

    // Retrieve natural image dimensions via React Native Image.getSize
    if (imgUrl) {
      Image.getSize(
        imgUrl,
        (w, h) => {
          if (w > 0 && h > 0) {
            setSourceDimensions({ width: w, height: h });
          }
        },
        () => {
          // If network getSize fails, keep default 4:5 ratio
        }
      );
    }

    // Only attempt HTML5 canvas image loading in actual browser environments (silently fallback in React Native)
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      loadHtmlImage(imgUrl)
        .then((img) => {
          setSourceImg(img);
          if (img.naturalWidth && img.naturalHeight) {
            setSourceDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }
        })
        .catch(() => {
          // Silently fall back to live React Native GPU transforms without yellow box console warnings
        });
    }
  }, [currentScreen, activeStudioMedia?.id]);

  // Update canvas render preview whenever source image or recipe changes
  useEffect(() => {
    if (!sourceImg || currentScreen !== 'anti_lens_studio') return;
    try {
      const renderedCanvas = renderCanvasTransform(sourceImg, studioRecipe, 1024);
      const dataUrl = renderedCanvas.toDataURL('image/jpeg', 0.85);
      setCanvasPreviewDataUrl(dataUrl);
    } catch (err) {
      console.warn('Canvas render notice:', err);
    }
  }, [sourceImg, studioRecipe, currentScreen]);

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

    const updated = discardColorGroup(colorGroups, groupId);
    setColorGroups(updated);
    setSwatchCount(updated.length);

    if (activeSwatchTab === groupId) {
      setActiveSwatchTab('common');
    }

    if (previewActiveGroupId === groupId) {
      setPreviewActiveGroupId(updated[0]?.id || '');
    }

    setMediaList((prev) => unlinkDiscardedMedia(prev, groupId));

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

  // ── ANTI-LENS MEDIA VERSION STACK HANDLERS ──
  const handleToggleActiveSource = async (mediaId: string, targetSource: 'original' | 'modified') => {
    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          const activeUrl = targetSource === 'modified' && m.modifiedUri ? m.modifiedUri : (m.originalUri || m.uri);
          return {
            ...m,
            activeDisplaySource: targetSource,
            uri: activeUrl,
          };
        }
        return m;
      })
    );

    if (activeStackMedia?.id === mediaId) {
      setActiveStackMedia((prev) =>
        prev
          ? {
              ...prev,
              activeDisplaySource: targetSource,
              uri: targetSource === 'modified' && prev.modifiedUri ? prev.modifiedUri : (prev.originalUri || prev.uri),
            }
          : null
      );
    }

    try {
      if (productId) {
        await storeAdminService.toggleMediaDisplaySource(productId, mediaId, targetSource);
      }
    } catch (err) {
      console.warn('Failed to persist toggle display source to backend:', err);
    }
  };

  const handleDeleteModified = async (mediaId: string) => {
    const item = mediaList.find((m) => m.id === mediaId);
    if (!item) return;

    const originalUrl = item.originalUri || item.uri;

    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          return {
            ...m,
            uri: originalUrl,
            modifiedUri: null,
            activeDisplaySource: 'original',
            hasModified: false,
            transformRecipe: null,
          };
        }
        return m;
      })
    );

    if (activeStackMedia?.id === mediaId) {
      setActiveStackMedia((prev) =>
        prev
          ? {
              ...prev,
              uri: originalUrl,
              modifiedUri: null,
              activeDisplaySource: 'original',
              hasModified: false,
              transformRecipe: null,
            }
          : null
      );
    }

    try {
      if (productId) {
        await storeAdminService.deleteModifiedMedia(productId, mediaId);
      }
    } catch (err) {
      console.warn('Failed to delete modified media on backend:', err);
    }
  };

  // ── QUICK STUDIO ACTION HANDLERS ──
  const handleApplyLensProofPreset = () => {
    const preset = getLensProofPreset('VAYYARI');
    setStudioRecipe(preset);
  };

  const handleResetRecipe = () => {
    setStudioRecipe({
      ...DEFAULT_RECIPE,
      watermark: {
        ...DEFAULT_RECIPE.watermark!,
        text: 'VAYYARI',
      },
    });
  };

  const handleStudioRotate = (delta: number) => {
    setStudioRecipe((prev) => ({
      ...prev,
      rotateDegrees: (prev.rotateDegrees + delta + 360) % 360,
    }));
  };

  const handleStudioToggleFlipH = () => {
    setStudioRecipe((prev) => ({
      ...prev,
      flipH: !prev.flipH,
    }));
  };

  const handleStudioToggleFlipV = () => {
    setStudioRecipe((prev) => ({
      ...prev,
      flipV: !prev.flipV,
    }));
  };

  const getStudioFramingBounds = (
    ratio = studioRecipe.crop?.aspectRatio || 'free',
    zoom = studioZoomScale
  ) => {
    const maxStageW = 280;
    const maxStageH = 340;

    let targetRatio = sourceDimensions.width / Math.max(1, sourceDimensions.height);
    if (ratio === '4:5') targetRatio = 4 / 5;
    else if (ratio === '1:1') targetRatio = 1 / 1;
    else if (ratio === '3:4') targetRatio = 3 / 4;

    let w = maxStageW;
    let h = Math.round(w / targetRatio);
    if (h > maxStageH) {
      h = maxStageH;
      w = Math.round(h * targetRatio);
    }
    const frame = { width: Math.round(w), height: Math.round(h) };

    const srcRatio = sourceDimensions.width / Math.max(1, sourceDimensions.height);
    const frameRatio = frame.width / frame.height;

    let imgW = frame.width;
    let imgH = frame.height;
    if (srcRatio > frameRatio) {
      imgW = frame.height * srcRatio * zoom;
      imgH = frame.height * zoom;
    } else {
      imgW = frame.width * zoom;
      imgH = (frame.width / srcRatio) * zoom;
    }

    const maxPanX = Math.max(0, Math.round((imgW - frame.width) / 2));
    const maxPanY = Math.max(0, Math.round((imgH - frame.height) / 2));
    return { frame, maxPanX, maxPanY };
  };

  const handleStudioSetAspectRatio = (ratio: '4:5' | '1:1' | '3:4' | 'free') => {
    setStudioPanOffset({ x: 0, y: 0 }); // Center image by default
    const coverCrop = computeCoverCrop(
      sourceDimensions.width,
      sourceDimensions.height,
      ratio,
      { x: 0, y: 0 },
      studioZoomScale
    );
    setStudioRecipe((prev) => ({ ...prev, crop: coverCrop }));
  };

  const handleStudioAdjustPan = (dx: number, dy: number) => {
    const { maxPanX, maxPanY } = getStudioFramingBounds();
    const newX = maxPanX > 0 ? Math.max(-maxPanX, Math.min(maxPanX, studioPanOffset.x + dx)) : 0;
    const newY = maxPanY > 0 ? Math.max(-maxPanY, Math.min(maxPanY, studioPanOffset.y + dy)) : 0;
    setStudioPanOffset({ x: newX, y: newY });

    const normX = maxPanX > 0 ? newX / maxPanX : 0;
    const normY = maxPanY > 0 ? newY / maxPanY : 0;
    const coverCrop = computeCoverCrop(
      sourceDimensions.width,
      sourceDimensions.height,
      studioRecipe.crop?.aspectRatio || 'free',
      { x: normX, y: normY },
      studioZoomScale
    );
    setStudioRecipe((prev) => ({ ...prev, crop: coverCrop }));
  };

  const handleStudioSetFocusPreset = (focus: 'top' | 'center' | 'bottom' | 'left' | 'right') => {
    const { maxPanX, maxPanY } = getStudioFramingBounds();
    let newX = 0;
    let newY = 0;
    if (focus === 'top') newY = -maxPanY;
    else if (focus === 'bottom') newY = maxPanY;
    else if (focus === 'left') newX = -maxPanX;
    else if (focus === 'right') newX = maxPanX;

    setStudioPanOffset({ x: newX, y: newY });

    const normX = maxPanX > 0 ? newX / maxPanX : 0;
    const normY = maxPanY > 0 ? newY / maxPanY : 0;
    const coverCrop = computeCoverCrop(
      sourceDimensions.width,
      sourceDimensions.height,
      studioRecipe.crop?.aspectRatio || 'free',
      { x: normX, y: normY },
      studioZoomScale
    );
    setStudioRecipe((prev) => ({ ...prev, crop: coverCrop }));
  };

  const handleStudioAdjustZoom = (delta: number) => {
    const newZoom = Math.max(1.0, Math.min(2.5, Math.round((studioZoomScale + delta) * 10) / 10));
    setStudioZoomScale(newZoom);

    const { maxPanX, maxPanY } = getStudioFramingBounds(studioRecipe.crop?.aspectRatio, newZoom);
    const clampedX = maxPanX > 0 ? Math.max(-maxPanX, Math.min(maxPanX, studioPanOffset.x)) : 0;
    const clampedY = maxPanY > 0 ? Math.max(-maxPanY, Math.min(maxPanY, studioPanOffset.y)) : 0;
    setStudioPanOffset({ x: clampedX, y: clampedY });

    const normX = maxPanX > 0 ? clampedX / maxPanX : 0;
    const normY = maxPanY > 0 ? clampedY / maxPanY : 0;
    const coverCrop = computeCoverCrop(
      sourceDimensions.width,
      sourceDimensions.height,
      studioRecipe.crop?.aspectRatio || 'free',
      { x: normX, y: normY },
      newZoom
    );
    setStudioRecipe((prev) => ({ ...prev, crop: coverCrop }));
  };

  const handleApplyAndSaveStudio = async () => {
    if (!activeStudioMedia) return;
    const mediaId = activeStudioMedia.id;
    setSavingStudio(true);

    try {
      const originalUrl = activeStudioMedia.originalUri || activeStudioMedia.uri;

      let blob: Blob | null = null;
      if (sourceImg) {
        try {
          const fullCanvas = renderCanvasTransform(sourceImg, studioRecipe, 2048);
          blob = await canvasToBlob(fullCanvas, 0.88);
        } catch (canvasErr) {
          console.warn('Canvas export notice:', canvasErr);
        }
      }

      if (!blob) {
        blob = new Blob([JSON.stringify(studioRecipe)], { type: 'application/json' });
      }

      let localUrl = originalUrl;
      if (blob && blob.type && blob.type.startsWith('image/') && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        try {
          localUrl = URL.createObjectURL(blob);
        } catch {
          localUrl = canvasPreviewDataUrl || originalUrl;
        }
      } else if (canvasPreviewDataUrl) {
        localUrl = canvasPreviewDataUrl;
      }

      const updatedItem: StoreCurationMediaItem = {
        ...activeStudioMedia,
        originalUri: originalUrl,
        modifiedUri: localUrl,
        activeDisplaySource: 'modified',
        hasModified: true,
        transformRecipe: studioRecipe,
        uri: localUrl,
      };

      setMediaList((prev) => prev.map((m) => (m.id === mediaId ? updatedItem : m)));

      if (productId) {
        try {
          const res = await storeAdminService.uploadModifiedMedia(
            productId,
            mediaId,
            blob,
            JSON.stringify(studioRecipe)
          );
          setMediaList((prev) =>
            prev.map((m) =>
              m.id === mediaId
                ? {
                    ...m,
                    uri: res.url,
                    modifiedUri: res.modifiedUrl || res.url,
                  }
                : m
            )
          );
        } catch (apiErr) {
          console.warn('StoreAdminService uploadModifiedMedia notice:', apiErr);
        }
      }

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err) {
      console.error('Failed to save transformed media:', err);
    } finally {
      setSavingStudio(false);
    }
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
    const updatedGroups = colorGroups.map((g) => {
      const match = skuList.find((s) => s.id === g.id || s.colorGroupId === g.id);
      if (!match) return g;
      return {
        ...g,
        price: match.isPriceInherited ? null : match.price,
        mrp: match.isPriceInherited ? null : match.mrp,
        stockQuantity: match.stockQuantity,
        allowWaitlist: match.allowWaitlist,
        customMessage: match.customMessage,
      };
    });

    const payload = {
      productCode,
      title,
      fabric,
      mrp: parseFloat(mrp) || 0,
      salePrice: parseFloat(salePrice) || 0,
      lifecycleState,
      description,
      mediaList,
      colorGroups: updatedGroups,
      skus: skuList,
      tags: skuList.map((s) => s.customMessage).filter(Boolean) as string[],
    };
    onSave?.(payload);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  const handleSaveSkus = handleSaveCuration;

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

  // ── BACK NAVIGATION HANDLER (MODALS -> SCREEN WIZARD -> STORE CURATION HUB -> INVENTORY) ──
  const handleBackNavigation = useCallback(() => {
    if (showPreview) {
      setShowPreview(false);
      return true;
    }
    if (colorPickerModalGroupId) {
      setColorPickerModalGroupId(null);
      return true;
    }
    if (currentScreen === 'anti_lens_studio') {
      setCurrentScreen('qualify_and_group');
      setCurrentStage('qualify');
      return true;
    }
    if (selectedStudioMediaId) {
      setSelectedStudioMediaId(null);
      return true;
    }
    if (activeStackMedia) {
      setActiveStackMedia(null);
      return true;
    }
    if (currentScreen !== 'hub') {
      setCurrentScreen('hub');
      return true;
    }
    if (onBack) {
      onBack();
      return true;
    }
    return false;
  }, [
    showPreview,
    colorPickerModalGroupId,
    activeStudioMedia,
    activeStackMedia,
    currentScreen,
    onBack,
  ]);

  useEffect(() => {
    const onBackPress = () => {
      return handleBackNavigation();
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBackNavigation]);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: PREVIEW MODE (FULL 390px PDP SIMULATION)
  // ──────────────────────────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <YStack
        width="100%"
        maxWidth={isMobile ? '100%' : containerMaxWidth}
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
          paddingHorizontal={pagePaddingHorizontal}
          paddingTop={topInset > 0 ? topInset + 6 : 10}
          paddingBottom={10}
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
                source={{ uri: getMediaDisplayUri(currentPreviewMedia) }}
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
            {previewMedia.length > 1 && (
              <>
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
              </>
            )}

            {/* Top Badges */}
            <XStack position="absolute" top={10} left={10} zIndex={20} gap={6}>
              {previewMedia.length > 0 && (
                <View style={styles.slideCounter}>
                  <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                    {previewSlideIndex + 1}/{previewMedia.length}
                  </Text>
                </View>
              )}
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
            {previewMedia.length > 1 && (
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
            )}
          </View>

          {/* 2. Color Swatch Row Directly Below Carousel */}
          <YStack paddingHorizontal={pagePaddingHorizontal} paddingVertical={10} gap={6} borderBottomWidth={1} borderBottomColor="#F1F5F9">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={11} fontWeight="800" color="#1E293B" textTransform="uppercase">
                Colour: {colorGroups.find((g) => g.id === previewActiveGroupId)?.name || 'Standard'}
              </Text>
              <Text fontSize={10} color="#64748B">
                {colorGroups.length} Swatch{colorGroups.length === 1 ? '' : 'es'}
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
          {(() => {
            const activePreviewSku = skuList.find(
              (s) => s.colorGroupId === previewActiveGroupId || s.id === previewActiveGroupId
            ) || skuList[0];
            const effectivePreviewSale = activePreviewSku && !activePreviewSku.isPriceInherited && activePreviewSku.price != null
              ? activePreviewSku.price
              : parsedSalePrice;
            const effectivePreviewMrp = activePreviewSku && !activePreviewSku.isPriceInherited && activePreviewSku.mrp != null
              ? activePreviewSku.mrp
              : parsedMrp;
            const effectivePreviewDiscount = effectivePreviewMrp > effectivePreviewSale && effectivePreviewMrp > 0
              ? Math.round(((effectivePreviewMrp - effectivePreviewSale) / effectivePreviewMrp) * 100)
              : discountPercent;
            const previewStock = activePreviewSku ? activePreviewSku.stockQuantity : 10;
            const previewAllowWaitlist = activePreviewSku ? activePreviewSku.allowWaitlist : true;
            const previewCustomMsg = activePreviewSku?.customMessage;

            return (
              <YStack padding={cardPadding} gap={8}>
                <Text fontSize={11} fontWeight="800" color="#94A3B8" textTransform="uppercase">
                  {fabric} · Handloom
                </Text>
                <Text fontSize={16} fontWeight="800" color="#0F172A">
                  {title}
                </Text>

                {/* Highlighted Tag for Custom SKU Message */}
                {previewCustomMsg ? (
                  <XStack
                    alignSelf="flex-start"
                    backgroundColor="#FEF3C7"
                    borderColor="#F59E0B"
                    borderWidth={1}
                    paddingHorizontal={8}
                    paddingVertical={4}
                    borderRadius={6}
                    alignItems="center"
                    gap={5}
                  >
                    <LuSparkles size={11} color="#B45309" />
                    <Text fontSize={11} fontWeight="800" color="#92400E">
                      {previewCustomMsg}
                    </Text>
                  </XStack>
                ) : null}

                <XStack alignItems="center" gap={8}>
                  <Text fontSize={18} fontWeight="900" color="#0F172A">
                    ₹{effectivePreviewSale.toLocaleString('en-IN')}
                  </Text>
                  {effectivePreviewMrp > effectivePreviewSale && (
                    <Text fontSize={13} color="#94A3B8" textDecorationLine="line-through">
                      ₹{effectivePreviewMrp.toLocaleString('en-IN')}
                    </Text>
                  )}
                  {effectivePreviewDiscount > 0 && (
                    <View style={styles.discountPill}>
                      <Text fontSize={10} fontWeight="800" color="#15803D">
                        {effectivePreviewDiscount}% OFF
                      </Text>
                    </View>
                  )}
                  {activePreviewSku && !activePreviewSku.isPriceInherited && (
                    <View style={[styles.discountPill, { backgroundColor: '#DBEAFE' }]}>
                      <Text fontSize={9} fontWeight="800" color="#1E40AF">
                        Item Price
                      </Text>
                    </View>
                  )}
                </XStack>

                <Text fontSize={12} color="#475569" lineHeight={18}>
                  {description}
                </Text>

                {/* Action CTA: Add to Bag vs Join Restock Waitlist vs Sold Out */}
                <XStack marginTop={6} width="100%">
                  {previewStock > 0 ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: tokens.accent,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                        🛍 Add to Bag ({previewStock} in stock)
                      </Text>
                    </View>
                  ) : previewAllowWaitlist ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#B45309',
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                        🔔 Join Restock Waitlist
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#94A3B8',
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                        Sold Out (No Restock)
                      </Text>
                    </View>
                  )}
                </XStack>
              </YStack>
            );
          })()}
        </ScrollView>
      </YStack>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: MAIN PROGRESSIVE CURATION WORKBENCH (APP STANDARD CONTAINER)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={containerMaxWidth}
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
        paddingHorizontal={pagePaddingHorizontal}
        paddingTop={topInset + 8}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8} flex={1}>
          {(currentScreen !== 'hub' || onBack) ? (
            <Pressable onPress={handleBackNavigation} hitSlop={8} style={styles.topIconBtn}>
              <LuArrowLeft size={18} color={tokens.text} />
            </Pressable>
          ) : null}
          <YStack flex={1} marginRight={6}>
            <XStack alignItems="center" gap={5}>
              <LuStore size={15} color={tokens.accent} />
              <Text fontSize={15} fontWeight="900" color={tokens.text} numberOfLines={1}>
                {currentScreen === 'hub'
                  ? 'Store Curation'
                  : currentScreen === 'qualify_and_group'
                  ? 'Qualify & Group'
                  : currentScreen === 'metadata'
                  ? 'Product Metadata'
                  : currentScreen === 'anti_lens_studio'
                  ? 'Anti-Lens Media Studio'
                  : 'Manage SKUs'}
              </Text>
            </XStack>
            <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
              {currentScreen === 'hub'
                ? `${productCode} · ${title}`
                : currentScreen === 'qualify_and_group'
                ? `Stage ${currentStageIndex + 1} of 3 · ${productCode}`
                : currentScreen === 'metadata'
                ? `Story, AI & Commercial Margins · ${productCode}`
                : currentScreen === 'anti_lens_studio'
                ? `Slide #${activeStudioMedia?.sortOrder || 1} · Image Studio & Protection · ${productCode}`
                : `${skuList.length} Variations · ${productCode}`}
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
        <YStack backgroundColor={tokens.surface} borderBottomWidth={1} borderBottomColor={tokens.border} paddingVertical={10} paddingHorizontal={pagePaddingHorizontal}>
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: pagePaddingHorizontal,
          paddingTop: pagePaddingVertical,
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
          <YStack gap={14}>
            {/* Product Overview Card */}
            <View style={styles.hubProductCard}>
              <XStack alignItems="center" gap={12}>
                <Image
                  source={{ uri: getMediaDisplayUri(mediaList[0]) }}
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

            {/* Tile 3: Manage SKUs (Item Pricing, Inventory Qty, Restock Waitlist & Highlighted Tags) */}
            {isAlreadyInStore && (
              <Pressable
                onPress={() => setCurrentScreen('manage_skus')}
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
                    <View style={[styles.hubTileIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                      <LuLayers size={22} color="#2563EB" />
                    </View>
                    <YStack flex={1} gap={3}>
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={15} fontWeight="900" color={tokens.text}>
                          Manage SKUs
                        </Text>
                        <View style={[styles.hubTileBadge, { backgroundColor: '#DBEAFE' }]}>
                          <Text fontSize={9} fontWeight="800" color="#1E40AF">
                            {skuList.length} SKUs
                          </Text>
                        </View>
                      </XStack>
                      <Text fontSize={11} color={tokens.textMuted} lineHeight={16}>
                        Set item-level price overrides, inventory stock, restock waitlist toggles &amp; PDP highlighted tags.
                      </Text>

                      {/* SKU Metrics Summary Chips */}
                      <XStack alignItems="center" gap={6} marginTop={6} flexWrap="wrap">
                        <View style={styles.hubMetricChip}>
                          <LuBox size={11} color="#2563EB" />
                          <Text fontSize={10} fontWeight="700" color={tokens.text}>
                            {skuList.reduce((acc, s) => acc + (s.stockQuantity || 0), 0)} Total Stock
                          </Text>
                        </View>
                        <View style={styles.hubMetricChip}>
                          <LuSlidersHorizontal size={11} color={tokens.accent} />
                          <Text fontSize={10} fontWeight="700" color={tokens.text}>
                            {skuList.filter((s) => !s.isPriceInherited && s.price != null).length > 0
                              ? `${skuList.filter((s) => !s.isPriceInherited && s.price != null).length} Overridden`
                              : `Inherits ₹${Number(salePrice).toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                        <View style={styles.hubMetricChip}>
                          <LuBell size={11} color="#D97706" />
                          <Text fontSize={10} fontWeight="700" color="#D97706">
                            {skuList.filter((s) => s.allowWaitlist).length} Waitlist Ready
                          </Text>
                        </View>
                        {skuList.some((s) => !!s.customMessage) && (
                          <View style={styles.hubMetricChip}>
                            <LuTag size={11} color="#16A34A" />
                            <Text fontSize={10} fontWeight="700" color="#16A34A">
                              PDP Tags Active
                            </Text>
                          </View>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>

                  <View style={styles.hubTileChevron}>
                    <LuChevronRight size={18} color={tokens.textMuted} />
                  </View>
                </XStack>
              </Pressable>
            )}
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
                      source={{ uri: getMediaDisplayUri(item) }}
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

                    {/* Instagram Source Badge */}
                    {item.sourcePlatform === 'instagram' && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          backgroundColor: '#E1306C',
                          borderRadius: 4,
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          zIndex: 4,
                        }}
                      >
                        <LuInstagram size={9} color="#FFFFFF" />
                        <Text fontSize={7} fontWeight="800" color="#FFFFFF">
                          INSTA
                        </Text>
                      </View>
                    )}

                    {/* Video Badge */}
                    {item.mediaType === 'video' && (
                      <View style={styles.tileVideoBadge}>
                        <LuVideo size={9} color="#FFFFFF" />
                        <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                          {item.durationSeconds ? `0:${item.durationSeconds}` : 'VIDEO'}
                        </Text>
                      </View>
                    )}

                    {/* Anti-Lens Status Badge (If Image) */}
                    {item.mediaType !== 'video' && (
                      <View
                        style={[
                          styles.tileLensBadge,
                          {
                            backgroundColor: item.hasModified ? '#8B5CF6' : 'rgba(15, 23, 42, 0.75)',
                          },
                        ]}
                      >
                        <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                          {item.hasModified ? '✦ MOD' : 'RAW'}
                        </Text>
                      </View>
                    )}

                    {/* Anti-Lens Studio Trigger Button (Opens dedicated studio page) */}
                    {item.mediaType !== 'video' && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedStudioMediaId(item.id);
                          setCurrentScreen('anti_lens_studio');
                        }}
                        style={styles.tileStackTriggerBtn}
                        hitSlop={6}
                      >
                        <LuShield size={11} color="#FFFFFF" />
                      </Pressable>
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
                contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 4 }}
                style={{ marginHorizontal: -12 }}
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
                              backgroundColor: xPressed ? `${tokens.textMuted}30` : `${tokens.textMuted}14`,
                            },
                          ]}
                          accessibilityLabel={`Discard Swatch #${idx + 1}`}
                        >
                          <LuX size={10} color={tokens.textMuted} />
                        </Pressable>
                      )}

                      {/* Swatch Dot with Edit Pencil Badge directly on the swatch itself */}
                      <View style={styles.swatchDotWrapper}>
                        <CustomSwatchDot
                          template={swatchTemplate}
                          primaryColor={cg.slotA}
                          secondaryColor={cg.slotB || '#D4AF37'}
                          tertiaryColor={cg.slotC}
                          quaternaryColor={cg.slotD}
                          colors={cg.colors}
                          colorCount={cg.colorCount as any}
                          size={42}
                          selected={false}
                        />
                        {swatchTemplate !== 'multicolor' && (
                          <View
                            style={[
                              styles.swatchEditBadge,
                              {
                                backgroundColor: tokens.surface,
                                borderColor: tokens.border,
                              },
                            ]}
                          >
                            <LuPencil size={9} color={tokens.accent} />
                          </View>
                        )}
                      </View>

                      <YStack alignItems="center" gap={2}>
                        <Text fontSize={11} fontWeight="800" color={tokens.text} numberOfLines={1}>
                          Swatch #{idx + 1}
                        </Text>
                        <Text fontSize={9} color={tokens.textMuted} numberOfLines={1}>
                          {cg.name.split(' ')[0]}
                        </Text>
                      </YStack>
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

              <XStack flexWrap="wrap" gap={4} justifyContent="space-between" marginHorizontal={-12} paddingHorizontal={4}>
                {qualifiedMedia.map((m) => (
                  <View key={m.id} style={styles.miniRefTile}>
                    <Image source={{ uri: getMediaDisplayUri(m) }} style={styles.tileImage} resizeMode="cover" />
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
              contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }}
              style={{ marginHorizontal: -12 }}
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
                    <Image source={{ uri: getMediaDisplayUri(m) }} style={styles.tileImage} resizeMode="cover" />

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
                <YStack flex={1} gap={6}>
                  <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
                    MRP (Strikethrough):
                  </Text>
                  <XStack alignItems="center" style={styles.currencyInputBox}>
                    <Text fontSize={15} fontWeight="700" color={tokens.textMuted}>
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

                <YStack flex={1} gap={6}>
                  <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
                    Sale Price (Selling Rate):
                  </Text>
                  <XStack alignItems="center" style={styles.currencyInputBox}>
                    <Text fontSize={15} fontWeight="800" color={tokens.accent}>
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

        {/* =========================================================================
            STAGE: MANAGE SKUS (ITEM-LEVEL CONTROLS)
           ========================================================================= */}
        {currentScreen === 'manage_skus' && (
          <YStack gap={14}>
            <YStack gap={2}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Manage SKUs &amp; Variations
                </Text>
                <View style={[styles.statusPill, { backgroundColor: '#DBEAFE' }]}>
                  <Text fontSize={10} fontWeight="800" color="#1E40AF">
                    {skuList.length} SKUs Configured
                  </Text>
                </View>
              </XStack>
              <Text fontSize={11} color={tokens.textMuted}>
                Manage price inheritance, availability stock, restocking waitlists, and highlighted PDP tags per SKU.
              </Text>
            </YStack>

            {/* Parent Product Baseline Callout */}
            <YStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              padding={12}
              gap={8}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap={6}>
                  <LuStore size={14} color={tokens.accent} />
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    Parent Product Reference
                  </Text>
                </XStack>
                <View style={styles.codePill}>
                  <Text fontSize={10} fontWeight="800" color={tokens.textMuted}>
                    {productCode}
                  </Text>
                </View>
              </XStack>
              <XStack alignItems="center" gap={8} flexWrap="wrap">
                <View style={styles.hubMetricChip}>
                  <Text fontSize={10} color={tokens.textMuted}>
                    Parent Sale Price:
                  </Text>
                  <Text fontSize={10} fontWeight="800" color="#16A34A">
                    ₹{Number(salePrice).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.hubMetricChip}>
                  <Text fontSize={10} color={tokens.textMuted}>
                    Parent MRP:
                  </Text>
                  <Text fontSize={10} fontWeight="800" color={tokens.text}>
                    ₹{Number(mrp).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.hubMetricChip}>
                  <Text fontSize={10} color={tokens.textMuted}>
                    Base Cost:
                  </Text>
                  <Text fontSize={10} fontWeight="800" color={tokens.text}>
                    ₹{Number(baseCostPrice).toLocaleString('en-IN')}
                  </Text>
                </View>
              </XStack>
            </YStack>

            {/* List of SKU Cards */}
            {skuList.map((sku, index) => {
              const effectiveSkuSale = !sku.isPriceInherited && sku.price != null ? sku.price : Number(salePrice) || parsedSalePrice;
              const effectiveSkuMrp = !sku.isPriceInherited && sku.mrp != null ? sku.mrp : Number(mrp) || parsedMrp;
              const skuMargin = effectiveSkuSale > 0 && baseCostPrice > 0
                ? Math.round(((effectiveSkuSale - baseCostPrice) / effectiveSkuSale) * 100)
                : marginPercent;
              const skuDiscount = effectiveSkuMrp > effectiveSkuSale && effectiveSkuMrp > 0
                ? Math.round(((effectiveSkuMrp - effectiveSkuSale) / effectiveSkuMrp) * 100)
                : discountPercent;

              return (
                <YStack
                  key={sku.id || index}
                  backgroundColor={tokens.surface}
                  borderRadius={tokens.radius.md}
                  borderWidth={1}
                  borderColor={tokens.border}
                  padding={14}
                  gap={12}
                >
                  {/* SKU Header: Swatch + SKU Code + Colorway Name + Stock Pill */}
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8} flex={1}>
                      {/* Mini Swatch Dot */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: sku.colorHex,
                          borderWidth: 2,
                          borderColor: sku.secondaryHex || '#E2E8F0',
                        }}
                      />
                      <YStack gap={1}>
                        <XStack alignItems="center" gap={5}>
                          <Text fontSize={12} fontWeight="900" color={tokens.text} fontFamily="$mono">
                            {sku.skuCode}
                          </Text>
                        </XStack>
                        <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                          {sku.colorwayName}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Stock status badge */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            sku.stockQuantity > 5
                              ? '#DCFCE7'
                              : sku.stockQuantity > 0
                              ? '#FEF3C7'
                              : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        fontSize={10}
                        fontWeight="800"
                        color={
                          sku.stockQuantity > 5
                            ? '#15803D'
                            : sku.stockQuantity > 0
                            ? '#B45309'
                            : '#DC2626'
                        }
                      >
                        {sku.stockQuantity > 5
                          ? `${sku.stockQuantity} in stock`
                          : sku.stockQuantity > 0
                          ? `Low: ${sku.stockQuantity} left`
                          : 'Out of Stock'}
                      </Text>
                    </View>
                  </XStack>

                  {/* ── 1. Pricing Per SKU ── */}
                  <YStack
                    backgroundColor={sku.isPriceInherited ? `${tokens.surfaceRaised}` : `${tokens.accent}06`}
                    padding={10}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={sku.isPriceInherited ? tokens.border : `${tokens.accent}30`}
                    gap={8}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <YStack gap={1} flex={1}>
                        <Text fontSize={11} fontWeight="800" color={tokens.text}>
                          Price per SKU
                        </Text>
                        <Text fontSize={10} color={tokens.textMuted}>
                          {sku.isPriceInherited
                            ? 'Naturally inherits parent product price'
                            : 'Custom item-level price override active'}
                        </Text>
                      </YStack>

                      <Pressable
                        onPress={() => handleToggleSkuPriceInheritance(sku.id)}
                        style={[
                          styles.standardPillBtn,
                          {
                            backgroundColor: sku.isPriceInherited ? '#F1F5F9' : tokens.accent,
                            borderColor: sku.isPriceInherited ? '#CBD5E1' : tokens.accent,
                          },
                        ]}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="700"
                          color={sku.isPriceInherited ? tokens.text : tokens.accentForeground}
                        >
                          {sku.isPriceInherited ? 'Customize Price' : 'Inherit Parent'}
                        </Text>
                      </Pressable>
                    </XStack>

                    {sku.isPriceInherited ? (
                      <XStack alignItems="center" gap={8} marginTop={2}>
                        <Text fontSize={13} fontWeight="800" color={tokens.text}>
                          ₹{Number(salePrice).toLocaleString('en-IN')}
                        </Text>
                        <Text fontSize={11} color={tokens.textMuted} textDecorationLine="line-through">
                          ₹{Number(mrp).toLocaleString('en-IN')}
                        </Text>
                        <View style={[styles.hubTileBadge, { backgroundColor: '#DCFCE7' }]}>
                          <Text fontSize={9} fontWeight="800" color="#15803D">
                            {discountPercent}% OFF · {marginPercent}% Margin
                          </Text>
                        </View>
                      </XStack>
                    ) : (
                      <YStack gap={8} marginTop={4}>
                        <XStack gap={8}>
                          <YStack flex={1} gap={4}>
                            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                              Item Sale Price (₹)
                            </Text>
                            <XStack alignItems="center" style={styles.skuCurrencyBox}>
                              <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                                ₹
                              </Text>
                              <TextInput
                                value={sku.price != null ? sku.price.toString() : ''}
                                onChangeText={(val) => handleUpdateSkuPrice(sku.id, val)}
                                keyboardType="numeric"
                                placeholder={salePrice}
                                placeholderTextColor={tokens.textMuted}
                                style={styles.skuPriceTextInput}
                              />
                            </XStack>
                          </YStack>
                          <YStack flex={1} gap={4}>
                            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                              Item MRP (₹)
                            </Text>
                            <XStack alignItems="center" style={styles.skuCurrencyBox}>
                              <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                                ₹
                              </Text>
                              <TextInput
                                value={sku.mrp != null ? sku.mrp.toString() : ''}
                                onChangeText={(val) => handleUpdateSkuMrp(sku.id, val)}
                                keyboardType="numeric"
                                placeholder={mrp}
                                placeholderTextColor={tokens.textMuted}
                                style={styles.skuPriceTextInput}
                              />
                            </XStack>
                          </YStack>
                        </XStack>
                        <XStack alignItems="center" gap={6}>
                          <View style={[styles.hubTileBadge, { backgroundColor: '#DCFCE7' }]}>
                            <Text fontSize={9} fontWeight="800" color="#15803D">
                              {skuDiscount}% OFF
                            </Text>
                          </View>
                          <View style={[styles.hubTileBadge, { backgroundColor: '#FEF3C7' }]}>
                            <Text fontSize={9} fontWeight="800" color="#B45309">
                              {skuMargin}% Margin
                            </Text>
                          </View>
                        </XStack>
                      </YStack>
                    )}
                  </YStack>

                  {/* ── 2. Availability Qty ── */}
                  <YStack gap={6}>
                    <Text fontSize={11} fontWeight="800" color={tokens.text}>
                      Availability Quantity
                    </Text>
                    <XStack alignItems="center" gap={8}>
                      <Pressable
                        onPress={() => handleUpdateSkuStock(sku.id, (sku.stockQuantity || 0) - 1)}
                        style={styles.qtyStepperBtn}
                        hitSlop={6}
                      >
                        <LuMinus size={14} color={tokens.text} />
                      </Pressable>

                      <TextInput
                        value={sku.stockQuantity.toString()}
                        onChangeText={(val) => handleUpdateSkuStock(sku.id, Number(val.replace(/[^0-9]/g, '')))}
                        keyboardType="numeric"
                        style={styles.qtyInput}
                      />

                      <Pressable
                        onPress={() => handleUpdateSkuStock(sku.id, (sku.stockQuantity || 0) + 1)}
                        style={styles.qtyStepperBtn}
                        hitSlop={6}
                      >
                        <LuPlus size={14} color={tokens.text} />
                      </Pressable>

                      {/* Quick Presets */}
                      <XStack gap={6} marginLeft={4}>
                        {[0, 5, 10, 20].map((preset) => (
                          <Pressable
                            key={preset}
                            onPress={() => handleUpdateSkuStock(sku.id, preset)}
                            style={[
                              styles.qtyPresetBtn,
                              {
                                backgroundColor: sku.stockQuantity === preset ? tokens.accent : '#F1F5F9',
                                borderColor: sku.stockQuantity === preset ? tokens.accent : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text
                              fontSize={11}
                              fontWeight="700"
                              color={sku.stockQuantity === preset ? tokens.accentForeground : tokens.text}
                            >
                              {preset === 0 ? 'Out' : preset}
                            </Text>
                          </Pressable>
                        ))}
                      </XStack>
                    </XStack>
                  </YStack>

                  {/* ── 3. Join Waitlist Toggle ── */}
                  <YStack
                    padding={10}
                    borderRadius={8}
                    backgroundColor={sku.allowWaitlist ? '#F0FDF4' : '#F8FAFC'}
                    borderWidth={1}
                    borderColor={sku.allowWaitlist ? '#BBF7D0' : tokens.border}
                    gap={4}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={6} flex={1}>
                        <LuBell size={14} color={sku.allowWaitlist ? '#15803D' : tokens.textMuted} />
                        <YStack flex={1}>
                          <Text fontSize={11} fontWeight="800" color={tokens.text}>
                            Join Waitlist when Out of Stock
                          </Text>
                          <Text fontSize={9} color={tokens.textMuted} lineHeight={13}>
                            Shows '🔔 Join Waitlist' button on PDP for skus that have probability of restocking.
                          </Text>
                        </YStack>
                      </XStack>

                      <Pressable
                        onPress={() => handleToggleSkuWaitlist(sku.id)}
                        style={[
                          styles.standardPillBtn,
                          {
                            backgroundColor: sku.allowWaitlist ? '#15803D' : '#94A3B8',
                            borderColor: sku.allowWaitlist ? '#15803D' : '#94A3B8',
                          },
                        ]}
                      >
                        <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                          {sku.allowWaitlist ? 'Enabled ✓' : 'Disabled'}
                        </Text>
                      </Pressable>
                    </XStack>
                  </YStack>

                  {/* ── 4. Custom Message Field (Highlighted PDP Tag) ── */}
                  <YStack gap={6}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={4}>
                        <LuTag size={12} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="800" color={tokens.text}>
                          Custom Message (Highlighted PDP Tag)
                        </Text>
                      </XStack>
                      {sku.customMessage ? (
                        <Pressable onPress={() => handleUpdateSkuCustomMessage(sku.id, '')}>
                          <Text fontSize={10} color="#DC2626" fontWeight="700">
                            Clear
                          </Text>
                        </Pressable>
                      ) : null}
                    </XStack>

                    <XStack alignItems="center" style={styles.customMessageBox}>
                      <TextInput
                        value={sku.customMessage || ''}
                        onChangeText={(val) => handleUpdateSkuCustomMessage(sku.id, val)}
                        placeholder="e.g. Pure Zari Weave · Varanasi Loom"
                        placeholderTextColor={tokens.textMuted}
                        style={styles.customMessageTextInput}
                      />
                    </XStack>

                    {/* Quick Suggestions */}
                    <XStack gap={6} flexWrap="wrap">
                      {[
                        '✨ Pure Silk Mark',
                        '🔥 Selling Fast',
                        '⏳ Limited Weave',
                        '⚡ Ships Tomorrow',
                        '🌿 Natural Dyes',
                      ].map((preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => handleUpdateSkuCustomMessage(sku.id, preset)}
                          style={styles.suggestionChip}
                        >
                          <Text fontSize={10} fontWeight="600" color={tokens.text}>
                            {preset}
                          </Text>
                        </Pressable>
                      ))}
                    </XStack>

                    {/* Live PDP Tag Preview */}
                    {sku.customMessage ? (
                      <XStack alignItems="center" gap={6} marginTop={2}>
                        <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                          PDP Badge Preview:
                        </Text>
                        <XStack
                          backgroundColor="#FEF3C7"
                          borderColor="#F59E0B"
                          borderWidth={1}
                          paddingHorizontal={8}
                          paddingVertical={3}
                          borderRadius={5}
                          alignItems="center"
                          gap={4}
                        >
                          <LuSparkles size={10} color="#B45309" />
                          <Text fontSize={10} fontWeight="800" color="#92400E">
                            {sku.customMessage}
                          </Text>
                        </XStack>
                      </XStack>
                    ) : null}
                  </YStack>
                </YStack>
              );
            })}
          </YStack>
        )}

        {/* =========================================================================
            SCREEN 5: DEDICATED ANTI-LENS MEDIA STUDIO PAGE
           ========================================================================= */}
        {currentScreen === 'anti_lens_studio' && (
          <YStack gap={16} paddingBottom={40}>
            {!activeStudioMedia ? (
              <YStack padding={30} alignItems="center" justifyContent="center">
                <Text fontSize={14} color={tokens.textMuted} marginBottom={14}>
                  No photo selected for Anti-Lens Studio.
                </Text>
                <Pressable
                  onPress={() => {
                    setCurrentScreen('qualify_and_group');
                    setCurrentStage('qualify');
                  }}
                  style={[styles.standardPillBtn, { backgroundColor: tokens.accent, borderColor: tokens.accent }]}
                >
                  <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                    Return to Qualify Media
                  </Text>
                </Pressable>
              </YStack>
            ) : (() => {
              const originalUrl = activeStudioMedia.originalUri || activeStudioMedia.uri;
              const modifiedUrl = activeStudioMedia.modifiedUri;
              const hasModified = !!activeStudioMedia.hasModified && !!modifiedUrl;
              const activeSource = activeStudioMedia.activeDisplaySource || (hasModified ? 'modified' : 'original');
              const isOriginalActive = activeSource === 'original';
              const isModifiedActive = activeSource === 'modified';

              const getStudioAspectRatioCropStyle = (ratio?: string) => {
                const maxStageW = 280;
                const maxStageH = 340;

                let targetRatio = sourceDimensions.width / Math.max(1, sourceDimensions.height);
                if (ratio === '4:5') targetRatio = 4 / 5;
                else if (ratio === '1:1') targetRatio = 1 / 1;
                else if (ratio === '3:4') targetRatio = 3 / 4;

                let w = maxStageW;
                let h = Math.round(w / targetRatio);
                if (h > maxStageH) {
                  h = maxStageH;
                  w = Math.round(h * targetRatio);
                }
                return { width: Math.round(w), height: Math.round(h) };
              };

              const getWatermarkPositionStyle = (preset?: string) => {
                switch (preset) {
                  case 'corner-bottom-left':
                    return { bottom: 12, left: 12 };
                  case 'center-emboss':
                    return {
                      alignSelf: 'center' as const,
                      top: '42%' as any,
                      transform: [{ rotate: '-20deg' }],
                    };
                  case 'diagonal-tile':
                    return {
                      alignSelf: 'center' as const,
                      top: '35%' as any,
                      transform: [{ rotate: '-30deg' }],
                    };
                  case 'corner-bottom-right':
                  default:
                    return { bottom: 12, right: 12 };
                }
              };

              return (
                <YStack gap={16}>
                  {/* ── 1. HORIZONTAL MEDIA SELECTOR STRIP ── */}
                  <YStack gap={6}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={6}>
                        <LuImage size={14} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
                          Select Photo to Transform
                        </Text>
                      </XStack>
                      <Text fontSize={10} color={tokens.textMuted}>
                        Slide #{activeStudioMedia.sortOrder} of {mediaList.filter((m) => m.mediaType !== 'video').length}
                      </Text>
                    </XStack>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.studioThumbScrollContent}
                    >
                      {mediaList
                        .filter((m) => m.mediaType !== 'video')
                        .map((m) => {
                          const isSelected = m.id === activeStudioMedia.id;
                          const thumbSrc = m.thumbnailUri || m.modifiedUri || m.originalUri || m.uri;
                          return (
                            <Pressable
                              key={m.id}
                              onPress={() => setSelectedStudioMediaId(m.id)}
                              style={[
                                styles.studioThumbTile,
                                {
                                  borderColor: isSelected ? tokens.accent : tokens.border,
                                  borderWidth: isSelected ? 2.5 : 1,
                                  backgroundColor: tokens.surface,
                                },
                              ]}
                            >
                              <Image source={{ uri: thumbSrc }} style={styles.studioThumbImg} resizeMode="cover" />
                              <View style={styles.studioThumbOrderBadge}>
                                <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                                  #{m.sortOrder}
                                </Text>
                              </View>
                              {m.hasModified && (
                                <View style={[styles.studioThumbModBadge, { backgroundColor: '#8B5CF6' }]}>
                                  <Text fontSize={7} fontWeight="900" color="#FFFFFF">
                                    MOD
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                    </ScrollView>
                  </YStack>

                  {/* ── 2. DUAL-VERSION STATUS & LIVE STORE CONTROL ── */}
                  <YStack gap={8}>
                    <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
                      Storefront Versioning Status
                    </Text>

                    <XStack gap={10} flexWrap="wrap">
                      {/* CARD 1: ORIGINAL MASTER */}
                      <View
                        style={[
                          styles.studioVersionCard,
                          {
                            borderColor: isOriginalActive ? tokens.accent : tokens.border,
                            borderWidth: isOriginalActive ? 2 : 1,
                            backgroundColor: tokens.surface,
                          },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="space-between" marginBottom={8}>
                          <Text fontSize={11} fontWeight="800" color={isOriginalActive ? tokens.accent : tokens.textMuted}>
                            ORIGINAL MASTER
                          </Text>
                          {isOriginalActive && (
                            <View style={[styles.studioLiveTag, { backgroundColor: tokens.accent }]}>
                              <LuCheck size={9} color="#FFFFFF" strokeWidth={3} />
                              <Text fontSize={8} fontWeight="900" color="#FFFFFF">
                                LIVE ON STORE
                              </Text>
                            </View>
                          )}
                        </XStack>

                        <Text fontSize={10} color={tokens.textMuted} marginBottom={10} numberOfLines={1}>
                          Raw supplier photo • Pristine high-res master
                        </Text>

                        <Pressable
                          onPress={() => handleToggleActiveSource(activeStudioMedia.id, 'original')}
                          style={[
                            styles.studioRadioBtn,
                            {
                              borderColor: isOriginalActive ? tokens.accent : tokens.border,
                              backgroundColor: isOriginalActive ? `${tokens.accent}14` : 'transparent',
                            },
                          ]}
                        >
                          <View style={[styles.radioCircle, { borderColor: isOriginalActive ? tokens.accent : tokens.textMuted }]}>
                            {isOriginalActive && <View style={[styles.radioDot, { backgroundColor: tokens.accent }]} />}
                          </View>
                          <Text fontSize={10} fontWeight={isOriginalActive ? '800' : '600'} color={isOriginalActive ? tokens.accent : tokens.text}>
                            {isOriginalActive ? 'Currently Live on Store' : 'Show Original on Store'}
                          </Text>
                        </Pressable>
                      </View>

                      {/* CARD 2: LENS-PROOF MODIFIED */}
                      <View
                        style={[
                          styles.studioVersionCard,
                          {
                            borderColor: isModifiedActive ? '#8B5CF6' : tokens.border,
                            borderWidth: isModifiedActive ? 2 : 1,
                            backgroundColor: tokens.surface,
                          },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="space-between" marginBottom={8}>
                          <XStack alignItems="center" gap={4}>
                            <LuSparkles size={11} color="#8B5CF6" />
                            <Text fontSize={11} fontWeight="800" color={isModifiedActive ? '#8B5CF6' : tokens.textMuted}>
                              LENS-PROOF MODIFIED
                            </Text>
                          </XStack>
                          {isModifiedActive && (
                            <View style={[styles.studioLiveTag, { backgroundColor: '#8B5CF6' }]}>
                              <LuCheck size={9} color="#FFFFFF" strokeWidth={3} />
                              <Text fontSize={8} fontWeight="900" color="#FFFFFF">
                                LIVE ON STORE
                              </Text>
                            </View>
                          )}
                        </XStack>

                        <Text fontSize={10} color={tokens.textMuted} marginBottom={10} numberOfLines={1}>
                          {hasModified ? 'WebP • Flipped, tilted & brand watermarked' : 'No modified version yet'}
                        </Text>

                        {hasModified ? (
                          <XStack gap={6} alignItems="center">
                            <Pressable
                              onPress={() => handleToggleActiveSource(activeStudioMedia.id, 'modified')}
                              style={[
                                styles.studioRadioBtn,
                                {
                                  flex: 1,
                                  borderColor: isModifiedActive ? '#8B5CF6' : tokens.border,
                                  backgroundColor: isModifiedActive ? '#8B5CF618' : 'transparent',
                                },
                              ]}
                            >
                              <View style={[styles.radioCircle, { borderColor: isModifiedActive ? '#8B5CF6' : tokens.textMuted }]}>
                                {isModifiedActive && <View style={[styles.radioDot, { backgroundColor: '#8B5CF6' }]} />}
                              </View>
                              <Text fontSize={10} fontWeight={isModifiedActive ? '800' : '600'} color={isModifiedActive ? '#8B5CF6' : tokens.text}>
                                {isModifiedActive ? 'Currently Live on Store' : 'Show Modified on Store'}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeleteModified(activeStudioMedia.id)}
                              hitSlop={8}
                              style={styles.studioTrashBtn}
                            >
                              <LuTrash2 size={13} color="#EF4444" />
                            </Pressable>
                          </XStack>
                        ) : (
                          <View style={styles.studioNotCreatedBox}>
                            <Text fontSize={9} color={tokens.textMuted}>
                              Apply transforms below to generate
                            </Text>
                          </View>
                        )}
                      </View>
                    </XStack>
                  </YStack>

                  {/* ── 3. INTERACTIVE LIVE CANVAS PREVIEW STAGE ── */}
                  <YStack gap={8}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={6}>
                        <LuSparkles size={13} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
                          Interactive Visual Canvas
                        </Text>
                      </XStack>

                      <XStack gap={8}>
                        <Pressable
                          onPress={handleResetRecipe}
                          style={[styles.studioHeaderActionBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                        >
                          <LuRotateCcw size={11} color={tokens.text} />
                          <Text fontSize={10} fontWeight="700" color={tokens.text}>
                            Reset
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleApplyLensProofPreset}
                          style={[styles.studioHeaderActionBtn, { backgroundColor: '#F59E0B', borderColor: '#D97706' }]}
                        >
                          <LuSparkles size={11} color="#FFFFFF" />
                          <Text fontSize={10} fontWeight="900" color="#FFFFFF">
                            Lens-Proof (1-Tap)
                          </Text>
                        </Pressable>
                      </XStack>
                    </XStack>

                    <View style={styles.studioPreviewStage}>
                      <View
                        style={[
                          styles.studioPreviewCropBox,
                          getStudioAspectRatioCropStyle(studioRecipe.crop?.aspectRatio),
                        ]}
                      >
                        <Image
                          source={{
                            uri:
                              activeStudioMedia.originalUri ||
                              activeStudioMedia.uri ||
                              '',
                          }}
                          style={[
                            styles.studioPreviewImg,
                            {
                              transform: [
                                { translateX: studioPanOffset.x },
                                { translateY: studioPanOffset.y },
                                {
                                  scale:
                                    studioZoomScale *
                                    (studioRecipe.rotateDegrees === 90 || studioRecipe.rotateDegrees === 270
                                      ? Math.max(
                                          getStudioAspectRatioCropStyle(studioRecipe.crop?.aspectRatio).width /
                                            getStudioAspectRatioCropStyle(studioRecipe.crop?.aspectRatio).height,
                                          getStudioAspectRatioCropStyle(studioRecipe.crop?.aspectRatio).height /
                                            getStudioAspectRatioCropStyle(studioRecipe.crop?.aspectRatio).width
                                        )
                                      : 1.0),
                                },
                                { rotate: `${studioRecipe.rotateDegrees}deg` },
                                { scaleX: studioRecipe.flipH ? -1 : 1 },
                                { scaleY: studioRecipe.flipV ? -1 : 1 },
                                { skewX: `${studioRecipe.tiltAngleX}deg` },
                                { skewY: `${studioRecipe.tiltAngleY}deg` },
                              ],
                            },
                          ]}
                          resizeMode="cover"
                        />

                        {/* Live Watermark Overlay (anchored strictly inside the image frame) */}
                        {studioRecipe.watermark?.enabled && studioRecipe.watermark.text ? (
                          <View
                            style={[
                              styles.studioWatermarkBadge,
                              getWatermarkPositionStyle(studioRecipe.watermark.preset),
                              { opacity: studioRecipe.watermark.opacity || 0.65 },
                            ]}
                          >
                            <Text fontSize={10} fontWeight="900" color={studioRecipe.watermark.color || '#FFFFFF'}>
                              ✦ {studioRecipe.watermark.text} ✦
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Real-time Applied Formula Badges */}
                      <XStack position="absolute" top={10} left={10} gap={6} flexWrap="wrap">
                        {studioRecipe.flipH && (
                          <View style={styles.studioAppliedBadge}>
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              ⇄ Flipped H
                            </Text>
                          </View>
                        )}
                        {studioRecipe.flipV && (
                          <View style={styles.studioAppliedBadge}>
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              ⇅ Flipped V
                            </Text>
                          </View>
                        )}
                        {(studioRecipe.tiltAngleX !== 0 || studioRecipe.tiltAngleY !== 0) && (
                          <View style={[styles.studioAppliedBadge, { backgroundColor: '#8B5CF6' }]}>
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              📐 Tilt {studioRecipe.tiltAngleX > 0 ? `+${studioRecipe.tiltAngleX}°` : `${studioRecipe.tiltAngleX}°`}
                            </Text>
                          </View>
                        )}
                        {studioRecipe.rotateDegrees !== 0 && (
                          <View style={[styles.studioAppliedBadge, { backgroundColor: '#0284C7' }]}>
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              ↻ {studioRecipe.rotateDegrees}°
                            </Text>
                          </View>
                        )}
                        {studioRecipe.watermark?.enabled && (
                          <View style={[styles.studioAppliedBadge, { backgroundColor: '#D4AF37' }]}>
                            <Text fontSize={9} fontWeight="800" color="#000000">
                              ✦ Watermarked
                            </Text>
                          </View>
                        )}
                      </XStack>
                    </View>
                  </YStack>

                  {/* ── 4. TRANSFORMATION CONTROLS (TABS) ── */}
                  <YStack gap={12}>
                    {/* Category Selector Tabs */}
                    <XStack
                      backgroundColor={tokens.background}
                      borderRadius={10}
                      padding={4}
                      gap={4}
                    >
                      <Pressable
                        onPress={() => setStudioActiveTab('transform')}
                        style={[
                          styles.studioTabBtn,
                          studioActiveTab === 'transform' && { backgroundColor: tokens.surface, elevation: 1 },
                        ]}
                      >
                        <LuCrop size={14} color={studioActiveTab === 'transform' ? tokens.accent : tokens.textMuted} />
                        <Text
                          fontSize={11}
                          fontWeight={studioActiveTab === 'transform' ? '800' : '600'}
                          color={studioActiveTab === 'transform' ? tokens.text : tokens.textMuted}
                        >
                          Transform &amp; Crop
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setStudioActiveTab('watermark')}
                        style={[
                          styles.studioTabBtn,
                          studioActiveTab === 'watermark' && { backgroundColor: tokens.surface, elevation: 1 },
                        ]}
                      >
                        <LuLayers size={14} color={studioActiveTab === 'watermark' ? tokens.accent : tokens.textMuted} />
                        <Text
                          fontSize={11}
                          fontWeight={studioActiveTab === 'watermark' ? '800' : '600'}
                          color={studioActiveTab === 'watermark' ? tokens.text : tokens.textMuted}
                        >
                          Brand Watermark
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setStudioActiveTab('presets')}
                        style={[
                          styles.studioTabBtn,
                          studioActiveTab === 'presets' && { backgroundColor: tokens.surface, elevation: 1 },
                        ]}
                      >
                        <LuSlidersHorizontal size={14} color={studioActiveTab === 'presets' ? tokens.accent : tokens.textMuted} />
                        <Text
                          fontSize={11}
                          fontWeight={studioActiveTab === 'presets' ? '800' : '600'}
                          color={studioActiveTab === 'presets' ? tokens.text : tokens.textMuted}
                        >
                          Fine Tilt (Anti-Lens)
                        </Text>
                      </Pressable>
                    </XStack>

                    {/* TAB 1: TRANSFORM & CROP */}
                    {studioActiveTab === 'transform' && (
                      <YStack gap={12} backgroundColor={tokens.surface} padding={14} borderRadius={10} borderWidth={1} borderColor={tokens.border}>
                        {/* Rotate & Flip Actions */}
                        <YStack gap={6}>
                          <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                            Rotation &amp; Directional Flipping
                          </Text>
                          <XStack gap={8} flexWrap="wrap">
                            <Pressable
                              onPress={() => handleStudioRotate(-90)}
                              style={[styles.studioToolBtn, { borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <LuRotateCcw size={14} color={tokens.text} />
                              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                                Rotate -90°
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleStudioRotate(90)}
                              style={[styles.studioToolBtn, { borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <LuRotateCw size={14} color={tokens.text} />
                              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                                Rotate +90°
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={handleStudioToggleFlipH}
                              style={[
                                styles.studioToolBtn,
                                {
                                  borderColor: studioRecipe.flipH ? tokens.accent : tokens.border,
                                  backgroundColor: studioRecipe.flipH ? `${tokens.accent}14` : tokens.background,
                                },
                              ]}
                            >
                              <Text fontSize={13} color={studioRecipe.flipH ? tokens.accent : tokens.text}>
                                ⇄
                              </Text>
                              <Text fontSize={11} fontWeight="700" color={studioRecipe.flipH ? tokens.accent : tokens.text}>
                                Flip Horizontal
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={handleStudioToggleFlipV}
                              style={[
                                styles.studioToolBtn,
                                {
                                  borderColor: studioRecipe.flipV ? tokens.accent : tokens.border,
                                  backgroundColor: studioRecipe.flipV ? `${tokens.accent}14` : tokens.background,
                                },
                              ]}
                            >
                              <Text fontSize={13} color={studioRecipe.flipV ? tokens.accent : tokens.text}>
                                ⇅
                              </Text>
                              <Text fontSize={11} fontWeight="700" color={studioRecipe.flipV ? tokens.accent : tokens.text}>
                                Flip Vertical
                              </Text>
                            </Pressable>
                          </XStack>
                        </YStack>

                        {/* Storefront Crop Ratio Options */}
                        <YStack gap={6} marginTop={4}>
                          <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                            Storefront Aspect Ratio
                          </Text>
                          <XStack gap={8} flexWrap="wrap">
                            {[
                              { id: '4:5', label: '4:5 Portrait (Store Standard)' },
                              { id: '1:1', label: '1:1 Square (Instagram/Grid)' },
                              { id: '3:4', label: '3:4 Catalog' },
                              { id: 'free', label: 'Unconstrained' },
                            ].map((opt) => {
                              const isSelected = (studioRecipe.crop?.aspectRatio || 'free') === opt.id;
                              return (
                                <Pressable
                                  key={opt.id}
                                  onPress={() => handleStudioSetAspectRatio(opt.id as any)}
                                  style={[
                                    styles.studioChipBtn,
                                    {
                                      borderColor: isSelected ? tokens.accent : tokens.border,
                                      backgroundColor: isSelected ? `${tokens.accent}14` : tokens.background,
                                    },
                                  ]}
                                >
                                  <Text
                                    fontSize={11}
                                    fontWeight={isSelected ? '800' : '600'}
                                    color={isSelected ? tokens.accent : tokens.text}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </XStack>
                        </YStack>

                        {/* Framing & Pan Position Controls */}
                        <YStack gap={8} marginTop={6} paddingTop={8} borderTopWidth={1} borderTopColor={tokens.border}>
                          <XStack alignItems="center" justifyContent="space-between">
                            <YStack gap={2}>
                              <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                                Frame Position &amp; Zoom
                              </Text>
                              <Text fontSize={9} color={tokens.textMuted}>
                                Pan and zoom to fill frame without blank borders
                              </Text>
                            </YStack>
                            <XStack gap={6} alignItems="center">
                              <View style={[styles.studioAppliedBadge, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                                <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                  {Math.round(studioZoomScale * 100)}% · X: {studioPanOffset.x} Y: {studioPanOffset.y}
                                </Text>
                              </View>
                              {(studioPanOffset.x !== 0 || studioPanOffset.y !== 0 || studioZoomScale !== 1.0) && (
                                <Pressable
                                  onPress={() => {
                                    setStudioPanOffset({ x: 0, y: 0 });
                                    setStudioZoomScale(1.0);
                                  }}
                                  style={[styles.studioChipBtn, { paddingVertical: 2, paddingHorizontal: 6, borderColor: tokens.border }]}
                                >
                                  <Text fontSize={9} fontWeight="700" color={tokens.accent}>
                                    Center Reset
                                  </Text>
                                </Pressable>
                              )}
                            </XStack>
                          </XStack>

                          <XStack gap={10} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                            {/* Directional D-Pad */}
                            <XStack alignItems="center" gap={4}>
                              <Pressable
                                onPress={() => handleStudioAdjustPan(-15, 0)}
                                style={[styles.studioToolBtn, { paddingHorizontal: 10, paddingVertical: 6, borderColor: tokens.border, backgroundColor: tokens.background }]}
                                hitSlop={6}
                              >
                                <LuChevronLeft size={13} color={tokens.text} />
                                <Text fontSize={10} fontWeight="700" color={tokens.text}>Left</Text>
                              </Pressable>

                              <YStack gap={4}>
                                <Pressable
                                  onPress={() => handleStudioAdjustPan(0, -15)}
                                  style={[styles.studioToolBtn, { paddingHorizontal: 10, paddingVertical: 4, borderColor: tokens.border, backgroundColor: tokens.background }]}
                                  hitSlop={6}
                                >
                                  <LuChevronUp size={13} color={tokens.text} />
                                </Pressable>
                                <Pressable
                                  onPress={() => handleStudioAdjustPan(0, 15)}
                                  style={[styles.studioToolBtn, { paddingHorizontal: 10, paddingVertical: 4, borderColor: tokens.border, backgroundColor: tokens.background }]}
                                  hitSlop={6}
                                >
                                  <LuChevronDown size={13} color={tokens.text} />
                                </Pressable>
                              </YStack>

                              <Pressable
                                onPress={() => handleStudioAdjustPan(15, 0)}
                                style={[styles.studioToolBtn, { paddingHorizontal: 10, paddingVertical: 6, borderColor: tokens.border, backgroundColor: tokens.background }]}
                                hitSlop={6}
                              >
                                <Text fontSize={10} fontWeight="700" color={tokens.text}>Right</Text>
                                <LuChevronRight size={13} color={tokens.text} />
                              </Pressable>
                            </XStack>

                            {/* Zoom In / Zoom Out Stepper */}
                            <XStack alignItems="center" gap={6}>
                              <Pressable
                                onPress={() => handleStudioAdjustZoom(-0.1)}
                                disabled={studioZoomScale <= 1.0}
                                style={[
                                  styles.studioToolBtn,
                                  {
                                    paddingHorizontal: 8,
                                    paddingVertical: 6,
                                    borderColor: tokens.border,
                                    backgroundColor: tokens.background,
                                    opacity: studioZoomScale <= 1.0 ? 0.4 : 1,
                                  },
                                ]}
                                hitSlop={6}
                              >
                                <LuMinus size={12} color={tokens.text} />
                                <Text fontSize={10} fontWeight="700" color={tokens.text}>Zoom Out</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => handleStudioAdjustZoom(0.1)}
                                disabled={studioZoomScale >= 2.5}
                                style={[
                                  styles.studioToolBtn,
                                  {
                                    paddingHorizontal: 8,
                                    paddingVertical: 6,
                                    borderColor: tokens.border,
                                    backgroundColor: tokens.background,
                                    opacity: studioZoomScale >= 2.5 ? 0.4 : 1,
                                  },
                                ]}
                                hitSlop={6}
                              >
                                <LuPlus size={12} color={tokens.text} />
                                <Text fontSize={10} fontWeight="700" color={tokens.text}>Zoom In</Text>
                              </Pressable>
                            </XStack>
                          </XStack>

                          {/* Quick 1-Tap Framing Focus Alignment */}
                          <XStack gap={6} alignItems="center" flexWrap="wrap" marginTop={2}>
                            <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
                              Focus:
                            </Text>
                            <Pressable
                              onPress={() => handleStudioSetFocusPreset('top')}
                              style={[styles.studioChipBtn, { paddingVertical: 3, paddingHorizontal: 8, borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                Top Focus
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleStudioSetFocusPreset('center')}
                              style={[styles.studioChipBtn, { paddingVertical: 3, paddingHorizontal: 8, borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                Center
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleStudioSetFocusPreset('bottom')}
                              style={[styles.studioChipBtn, { paddingVertical: 3, paddingHorizontal: 8, borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                Bottom Focus
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleStudioSetFocusPreset('left')}
                              style={[styles.studioChipBtn, { paddingVertical: 3, paddingHorizontal: 8, borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                Left
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleStudioSetFocusPreset('right')}
                              style={[styles.studioChipBtn, { paddingVertical: 3, paddingHorizontal: 8, borderColor: tokens.border, backgroundColor: tokens.background }]}
                            >
                              <Text fontSize={9} fontWeight="700" color={tokens.text}>
                                Right
                              </Text>
                            </Pressable>
                          </XStack>
                        </YStack>
                      </YStack>
                    )}

                    {/* TAB 2: BRAND WATERMARK */}
                    {studioActiveTab === 'watermark' && (
                      <YStack gap={12} backgroundColor={tokens.surface} padding={14} borderRadius={10} borderWidth={1} borderColor={tokens.border}>
                        <XStack alignItems="center" justifyContent="space-between">
                          <YStack gap={2}>
                            <Text fontSize={12} fontWeight="800" color={tokens.text}>
                              Brand Watermark Overlay
                            </Text>
                            <Text fontSize={10} color={tokens.textMuted}>
                              Protects proprietary catalog photos from competitor scraping.
                            </Text>
                          </YStack>

                          <Pressable
                            onPress={() =>
                              setStudioRecipe((prev) => ({
                                ...prev,
                                watermark: {
                                  ...prev.watermark!,
                                  enabled: !prev.watermark?.enabled,
                                },
                              }))
                            }
                            style={[
                              styles.studioTogglePill,
                              {
                                backgroundColor: studioRecipe.watermark?.enabled ? tokens.accent : '#94A3B8',
                              },
                            ]}
                          >
                            <Text fontSize={10} fontWeight="900" color="#FFFFFF">
                              {studioRecipe.watermark?.enabled ? 'ACTIVE' : 'OFF'}
                            </Text>
                          </Pressable>
                        </XStack>

                        {studioRecipe.watermark?.enabled && (
                          <YStack gap={10}>
                            {/* Brand Text Input */}
                            <YStack gap={4}>
                              <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                                Watermark Brand Text
                              </Text>
                              <TextInput
                                value={studioRecipe.watermark.text}
                                onChangeText={(t) =>
                                  setStudioRecipe((prev) => ({
                                    ...prev,
                                    watermark: { ...prev.watermark!, text: t },
                                  }))
                                }
                                placeholder="e.g. VAYYARI"
                                placeholderTextColor={tokens.textMuted}
                                style={[
                                  styles.studioTextInput,
                                  { borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.background },
                                ]}
                              />
                            </YStack>

                            {/* Placement Presets */}
                            <YStack gap={4}>
                              <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                                Placement Style
                              </Text>
                              <XStack gap={6} flexWrap="wrap">
                                {[
                                  { id: 'corner-bottom-right', label: 'Bottom-Right Emblem' },
                                  { id: 'corner-bottom-left', label: 'Bottom-Left Emblem' },
                                  { id: 'center-emboss', label: 'Center Subtle Stamp' },
                                  { id: 'diagonal-tile', label: 'Diagonal Tiled Stamp' },
                                ].map((p) => {
                                  const isSel = studioRecipe.watermark?.preset === p.id;
                                  return (
                                    <Pressable
                                      key={p.id}
                                      onPress={() =>
                                        setStudioRecipe((prev) => ({
                                          ...prev,
                                          watermark: { ...prev.watermark!, preset: p.id as any },
                                        }))
                                      }
                                      style={[
                                        styles.studioChipBtn,
                                        {
                                          borderColor: isSel ? tokens.accent : tokens.border,
                                          backgroundColor: isSel ? `${tokens.accent}14` : tokens.background,
                                        },
                                      ]}
                                    >
                                      <Text
                                        fontSize={11}
                                        fontWeight={isSel ? '800' : '600'}
                                        color={isSel ? tokens.accent : tokens.text}
                                      >
                                        {p.label}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </XStack>
                            </YStack>

                            {/* Opacity Selector */}
                            <YStack gap={4}>
                              <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                                Watermark Opacity: {Math.round((studioRecipe.watermark?.opacity || 0.65) * 100)}%
                              </Text>
                              <XStack gap={6}>
                                {[0.35, 0.5, 0.65, 0.8, 0.95].map((op) => {
                                  const isSel = Math.abs((studioRecipe.watermark?.opacity || 0.65) - op) < 0.05;
                                  return (
                                    <Pressable
                                      key={op}
                                      onPress={() =>
                                        setStudioRecipe((prev) => ({
                                          ...prev,
                                          watermark: { ...prev.watermark!, opacity: op },
                                        }))
                                      }
                                      style={[
                                        styles.studioChipBtn,
                                        {
                                          borderColor: isSel ? tokens.accent : tokens.border,
                                          backgroundColor: isSel ? `${tokens.accent}14` : tokens.background,
                                        },
                                      ]}
                                    >
                                      <Text
                                        fontSize={10}
                                        fontWeight={isSel ? '800' : '600'}
                                        color={isSel ? tokens.accent : tokens.text}
                                      >
                                        {Math.round(op * 100)}%
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </XStack>
                            </YStack>
                          </YStack>
                        )}
                      </YStack>
                    )}

                    {/* TAB 3: FINE TILT (ANTI-LENS FORMULA) */}
                    {studioActiveTab === 'presets' && (
                      <YStack gap={12} backgroundColor={tokens.surface} padding={14} borderRadius={10} borderWidth={1} borderColor={tokens.border}>
                        <View style={[styles.studioInfoBanner, { backgroundColor: '#FDF4FF', borderColor: '#E879F9' }]}>
                          <LuSparkles size={16} color="#A855F7" />
                          <Text fontSize={11} color="#6B21A8" flex={1} lineHeight={16}>
                            Perspective shear alters the geometric distance matrix of visual keypoints. A 3.5° tilt makes it statistically impossible for Google Lens to match the original supplier photo.
                          </Text>
                        </View>

                        {/* Tilt X Angle */}
                        <YStack gap={4}>
                          <Text fontSize={11} fontWeight="800" color={tokens.text}>
                            Perspective Tilt X: {studioRecipe.tiltAngleX > 0 ? `+${studioRecipe.tiltAngleX}°` : `${studioRecipe.tiltAngleX}°`}
                          </Text>
                          <XStack gap={6} flexWrap="wrap">
                            {[-6, -3.5, 0, 3.5, 6].map((deg) => {
                              const isSel = studioRecipe.tiltAngleX === deg;
                              return (
                                <Pressable
                                  key={deg}
                                  onPress={() => setStudioRecipe((prev) => ({ ...prev, tiltAngleX: deg }))}
                                  style={[
                                    styles.studioChipBtn,
                                    {
                                      borderColor: isSel ? tokens.accent : tokens.border,
                                      backgroundColor: isSel ? `${tokens.accent}14` : tokens.background,
                                    },
                                  ]}
                                >
                                  <Text
                                    fontSize={11}
                                    fontWeight={isSel ? '800' : '600'}
                                    color={isSel ? tokens.accent : tokens.text}
                                  >
                                    {deg === 0 ? '0° (Flat)' : `${deg > 0 ? `+${deg}` : deg}°`}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </XStack>
                        </YStack>

                        {/* Tilt Y Angle */}
                        <YStack gap={4}>
                          <Text fontSize={11} fontWeight="800" color={tokens.text}>
                            Perspective Tilt Y: {studioRecipe.tiltAngleY > 0 ? `+${studioRecipe.tiltAngleY}°` : `${studioRecipe.tiltAngleY}°`}
                          </Text>
                          <XStack gap={6} flexWrap="wrap">
                            {[-4, -2, 0, 2, 4].map((deg) => {
                              const isSel = studioRecipe.tiltAngleY === deg;
                              return (
                                <Pressable
                                  key={deg}
                                  onPress={() => setStudioRecipe((prev) => ({ ...prev, tiltAngleY: deg }))}
                                  style={[
                                    styles.studioChipBtn,
                                    {
                                      borderColor: isSel ? tokens.accent : tokens.border,
                                      backgroundColor: isSel ? `${tokens.accent}14` : tokens.background,
                                    },
                                  ]}
                                >
                                  <Text
                                    fontSize={11}
                                    fontWeight={isSel ? '800' : '600'}
                                    color={isSel ? tokens.accent : tokens.text}
                                  >
                                    {deg === 0 ? '0° (Flat)' : `${deg > 0 ? `+${deg}` : deg}°`}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </XStack>
                        </YStack>
                      </YStack>
                    )}
                  </YStack>
                </YStack>
              );
            })()}
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

      {/* ── FIXED BOTTOM BAR FOR MANAGE SKUS SCREEN ── */}
      {currentScreen === 'manage_skus' && (
        <View
          style={[
            styles.fixedBottomBar,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              paddingBottom: Math.max(bottomInset, 12),
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
              onPress={handleSaveSkus}
              hitSlop={12}
              style={({ pressed }) => [
                styles.bottomNavTextLink,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text fontSize={15} fontWeight="800" color="#15803D">
                Save SKUs
              </Text>
              <LuCheck size={20} color="#15803D" strokeWidth={3} />
            </Pressable>
          </XStack>
        </View>
      )}

      {/* ── FIXED BOTTOM BAR FOR ANTI-LENS STUDIO SCREEN ── */}
      {currentScreen === 'anti_lens_studio' && (
        <View
          style={[
            styles.fixedBottomBar,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              paddingBottom: Math.max(bottomInset, 12),
            },
          ]}
        >
          <XStack alignItems="center" justifyContent="space-between" width="100%">
            <Pressable
              onPress={() => {
                setCurrentScreen('qualify_and_group');
                setCurrentStage('qualify');
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.bottomNavTextLink,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <LuChevronLeft size={22} color={tokens.textMuted} strokeWidth={2.5} />
              <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                Qualify Media
              </Text>
            </Pressable>

            <Pressable
              onPress={handleApplyAndSaveStudio}
              disabled={savingStudio}
              hitSlop={12}
              style={({ pressed }) => [
                styles.bottomNavTextLink,
                { opacity: pressed || savingStudio ? 0.6 : 1 },
              ]}
            >
              {savingStudio ? (
                <ActivityIndicator size="small" color="#15803D" />
              ) : (
                <>
                  <Text fontSize={15} fontWeight="800" color="#15803D">
                    Apply &amp; Save
                  </Text>
                  <LuCheck size={20} color="#15803D" strokeWidth={3} />
                </>
              )}
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
  tileLensBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  tileStackTriggerBtn: {
    position: 'absolute',
    bottom: 6,
    right: 26,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  skuCurrencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 4,
  },
  skuPriceTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    outlineStyle: 'none' as any,
  },
  qtyStepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qtyInput: {
    width: 52,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 4,
    textAlignVertical: 'center',
    includeFontPadding: false,
    outlineStyle: 'none' as any,
  },
  qtyPresetBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  standardPillBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  customMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  customMessageTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    outlineStyle: 'none' as any,
  },
  suggestionChip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioThumbScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  studioThumbTile: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  studioThumbImg: {
    width: '100%',
    height: '100%',
  },
  studioThumbOrderBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  studioThumbModBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  studioVersionCard: {
    flex: 1,
    minWidth: 260,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  studioLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studioRadioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  studioTrashBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioNotCreatedBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  studioHeaderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  studioPreviewStage: {
    width: '100%',
    minHeight: 310,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    padding: 12,
  },
  studioPreviewCropBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#000000',
  },
  studioPreviewImg: {
    width: '100%',
    height: '100%',
  },
  studioWatermarkBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.8)',
  },
  studioAppliedBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  studioTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  studioToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  studioChipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  studioTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  studioTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  studioInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
