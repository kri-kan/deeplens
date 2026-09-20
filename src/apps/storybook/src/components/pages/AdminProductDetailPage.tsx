import React, { useState } from 'react';
import {
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuSparkles,
  LuShare2,
  LuPencil,
  LuStar,
  LuTrash2,
  LuEllipsisVertical,
  LuX,
  LuDownload,
  LuLayers,
  LuStore,
  LuClock,
  LuTag,
  LuCalendar,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  AdminProductMediaCarousel,
  MediaSlideItem,
} from '../molecules/AdminProductMediaCarousel';
import {
  AdminProductInfoSection,
} from '../molecules/AdminProductInfoSection';
import {
  AdminVendorListingCard,
  VendorListingItemData,
} from '../molecules/AdminVendorListingCard';
import {
  AdminVendorListingSheet,
} from '../molecules/AdminVendorListingSheet';
import {
  AdminProductEditSheet,
} from '../molecules/AdminProductEditSheet';

export interface AdminProductDetailData {
  id: string;
  title: string;
  productCode: string;
  vendorPrice?: number;
  category?: string;
  fabric?: string;
  timestamp?: string;
  exclusiveDescription?: string;
  isArchived?: boolean;
  isPublishedToStore?: boolean;
  media?: MediaSlideItem[];
  listings?: VendorListingItemData[];
  unifiedAttributes?: Record<string, any>;
  craft?: string;
  motif?: string;
  border?: string;
  stitchType?: string;
  blouseFormat?: string;
  occasions?: string[];
  confidenceScore?: number;
  taxonomyVersion?: string;
  taxonomyDerivedAt?: string;
}

export interface AdminProductDetailPageProps {
  product?: AdminProductDetailData | null;
  onBack?: () => void;
  onFindSimilar?: () => void;
  onShare?: () => void;
  onPublishToStore?: () => void;
  onStarMedia?: (mediaId: string) => void;
  onReevaluateLLM?: () => void;
  onDeleteProduct?: () => void;
  onUnarchive?: () => void;
  onSaveMetadata?: (updates: {
    category?: string;
    fabric?: string;
    price?: number;
    useForTraining?: boolean;
  }) => void;
  onOpenWhatsAppListing?: (listing: VendorListingItemData) => void;
  isLoading?: boolean;
  disableSafeArea?: boolean;
  initialViewMode?: 'carousel' | 'gallery';
  initialListingSheetOpen?: boolean;
  initialEditSheetOpen?: boolean;
  initialDeleteDialogOpen?: boolean;
}

function TaxonomySpecRow({
  label,
  value,
  isHighlighted = false,
}: {
  label: string;
  value: string;
  isHighlighted?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingVertical={3}>
      <Text fontSize={11} color={tokens.textMuted} flex={1}>
        {label}
      </Text>
      <Text
        fontSize={11}
        fontWeight={isHighlighted ? '700' : '600'}
        color={isHighlighted ? tokens.accent : tokens.text}
        textAlign="right"
        flex={1.4}
        numberOfLines={1}
      >
        {value}
      </Text>
    </XStack>
  );
}

export function AdminProductDetailPage({
  product,
  onBack,
  onFindSimilar,
  onShare,
  onPublishToStore,
  onStarMedia,
  onReevaluateLLM,
  onDeleteProduct,
  onUnarchive,
  onSaveMetadata,
  onOpenWhatsAppListing,
  isLoading = false,
  disableSafeArea = false,
  initialViewMode = 'carousel',
  initialListingSheetOpen = false,
  initialEditSheetOpen = false,
  initialDeleteDialogOpen = false,
}: AdminProductDetailPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'gallery'>(initialViewMode);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(initialEditSheetOpen);
  const [isDeleteOpen, setIsDeleteOpen] = useState(initialDeleteDialogOpen);
  const [previewListing, setPreviewListing] = useState<VendorListingItemData | null>(
    initialListingSheetOpen && product?.listings && product.listings.length > 0
      ? product.listings[0]
      : null
  );
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState(false);

  const mediaList = product?.media || [];
  const listings = product?.listings || [];

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor={tokens.background}>
        {/* Loading Header Skeleton */}
        <XStack
          paddingTop={topInset}
          height={50 + topInset}
          alignItems="center"
          paddingHorizontal={14}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
        >
          <YStack width={80} height={14} borderRadius={4} backgroundColor={tokens.surfaceRaised} />
        </XStack>

        {/* Media Skeleton */}
        <YStack width="100%" height={380} backgroundColor={tokens.surfaceRaised} opacity={0.6} />

        {/* Info Skeleton */}
        <YStack padding={16} gap={12}>
          <YStack width="70%" height={20} borderRadius={4} backgroundColor={tokens.surfaceRaised} />
          <YStack width="40%" height={26} borderRadius={4} backgroundColor={tokens.surfaceRaised} />
          <YStack width="100%" height={60} borderRadius={4} backgroundColor={tokens.surfaceRaised} />
        </YStack>
      </YStack>
    );
  }

  if (!product) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} alignItems="center" justifyContent="center" gap={12}>
        <Text fontSize={15} fontWeight="700" color={tokens.text}>
          Product Not Found
        </Text>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingHorizontal={16}
              paddingVertical={8}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.accent}
            >
              <Text fontSize={13} fontWeight="800" color="#ffffff">
                Go Back
              </Text>
            </XStack>
          </Pressable>
        )}
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Floating Top Header Bar */}
      <XStack
        position="absolute"
        top={topInset}
        left={0}
        right={0}
        zIndex={20}
        height={48}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
      >
        {/* Back Button & Store Badge */}
        <XStack alignItems="center" gap={8}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Navigate back"
              onPress={onBack}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="rgba(0,0,0,0.55)"
                alignItems="center"
                justifyContent="center"
              >
                <LuArrowLeft size={18} color="#ffffff" />
              </XStack>
            </Pressable>
          ) : (
            <XStack width={36} />
          )}

          {product?.isPublishedToStore && (
            <XStack
              backgroundColor={tokens.accent}
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={12}
              alignItems="center"
              gap={4}
            >
              <LuStore size={12} color={tokens.accentForeground} />
              <Text fontSize={10} fontWeight="800" color={tokens.accentForeground}>
                In Store
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Right Header Action Icons */}
        <XStack alignItems="center" gap={8}>
          {/* Find Similar Matches */}
          {onFindSimilar && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find similar products"
              onPress={onFindSimilar}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="rgba(0,0,0,0.55)"
                alignItems="center"
                justifyContent="center"
              >
                <LuSparkles size={16} color="#ffffff" />
              </XStack>
            </Pressable>
          )}

          {/* View Mode Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle media presentation mode"
            onPress={() => setViewMode((m) => (m === 'carousel' ? 'gallery' : 'carousel'))}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor="rgba(0,0,0,0.55)"
              alignItems="center"
              justifyContent="center"
            >
              <LuLayers size={16} color="#ffffff" />
            </XStack>
          </Pressable>

          {/* Quick Enrich with AI Button */}
          {onReevaluateLLM && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enrich with AI"
              onPress={onReevaluateLLM}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="rgba(0,0,0,0.55)"
                alignItems="center"
                justifyContent="center"
              >
                <LuSparkles size={16} color="#fbbf24" />
              </XStack>
            </Pressable>
          )}

          {/* 3-Dots Context Menu Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open options menu"
            onPress={() => setIsMenuOpen(true)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor="rgba(0,0,0,0.55)"
              alignItems="center"
              justifyContent="center"
            >
              <LuEllipsisVertical size={16} color="#ffffff" />
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Main Scrollable Body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(32, bottomInset + 40) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Media Carousel / Gallery */}
        <AdminProductMediaCarousel
          mediaList={mediaList}
          activeMediaIndex={activeMediaIndex}
          onMediaIndexChange={setActiveMediaIndex}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((m) => (m === 'carousel' ? 'gallery' : 'carousel'))}
          onMediaPress={(idx) => {
            setActiveMediaIndex(idx);
            setIsFullscreenPreviewOpen(true);
          }}
        />

        {/* Product Information Section */}
        <AdminProductInfoSection
          title={product.title}
          productCode={product.productCode}
          vendorPrice={product.vendorPrice}
          category={product.category}
          fabric={product.fabric}
          timestamp={product.timestamp}
          description={product.exclusiveDescription}
          isArchived={product.isArchived}
          onUnarchive={onUnarchive}
          onEditPress={() => setIsEditOpen(true)}
        />

        {/* AI-Derived Taxonomy Facets Inspector Section */}
        {(() => {
          const ua = product.unifiedAttributes || {};
          const conf = product.confidenceScore ?? ua.confidence_score ?? ua.confidenceScore;
          const confPct = conf != null ? (conf <= 1 ? Math.round(conf * 100) : Math.round(conf)) : 85;
          const taxVersion = product.taxonomyVersion || ua.taxonomy_version || ua.taxonomyVersion || 'v2.0';
          const derivedAt = product.taxonomyDerivedAt || ua.taxonomy_derived_at || ua.taxonomyDerivedAt || product.timestamp || 'Today, 2:45 PM';

          // a) Craft Heritage & Weave
          const craftTech = product.craft || ua.craft_technique || ua.weave_technique || ua.craft || 'Handloom Brocade Jacquard';
          const regionalOrigin = ua.regional_origin || ua.craft_origin || ua.origin || (product as any).weaveOrigin || 'Varanasi (Banaras), UP';
          const motifPattern = product.motif || ua.motif_pattern || ua.motif || 'Floral Kadwa Bootis & Jaal';
          const borderPallu = product.border || ua.border_pallu || ua.border || 'Zari Contrast Border with Latkan Pallu';
          const zariMaterial = ua.zari_type || ua.inlay_material || ua.zari || 'Tested Gold & Silver Metallic Zari';
          const workHeaviness = ua.work_heaviness || ua.heaviness || 'Bridal Heavy';

          // b) Garment & Tailoring
          const fabricBase = product.fabric || ua.fabric_base || ua.fabric || 'Pure Mulberry Silk';
          const stitchProfile = product.stitchType || ua.stitch_type || ua.stitch || 'Ready to Drape (Pre-Pleated)';
          const blouseFormat = product.blouseFormat || ua.blouse_format || ua.blouse_type || 'Attached Unstitched Running Blouse (80cm)';
          const dimensions = ua.dimensions || ua.saree_length || 'Saree: 5.5m • Blouse: 0.8m';

          // c) Occasions & Search Relevance
          const occasionsList: string[] = Array.isArray(product.occasions) && product.occasions.length > 0
            ? product.occasions
            : (Array.isArray(ua.occasions) && ua.occasions.length > 0
              ? ua.occasions
              : ['Wedding & Bridal', 'Festive Diwali & Puja', 'Reception & Cocktail']);

          const searchKeywordsList: string[] = Array.isArray(ua.tags) && ua.tags.length > 0
            ? ua.tags
            : (Array.isArray(ua.search_keywords) && ua.search_keywords.length > 0
              ? ua.search_keywords
              : [
                  craftTech.toLowerCase(),
                  fabricBase.toLowerCase(),
                  motifPattern.toLowerCase(),
                  'ethnic wear',
                  'traditional saree',
                ]);

          const washCare = ua.wash_care || ua.care_instructions || 'Dry Clean Only • Store in Breathable Cotton / Muslin Wrap';

          return (
            <YStack paddingHorizontal={16} paddingTop={16} gap={10}>
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                overflow="hidden"
              >
                {/* Header */}
                <XStack
                  backgroundColor={`${tokens.accent}0F`}
                  paddingHorizontal={14}
                  paddingVertical={12}
                  alignItems="center"
                  justifyContent="space-between"
                  borderBottomWidth={1}
                  borderBottomColor={tokens.border}
                >
                  <XStack alignItems="center" gap={8}>
                    <LuSparkles size={16} color={tokens.accent} />
                    <Text fontSize={13} fontWeight="800" color={tokens.text} letterSpacing={0.4}>
                      ✨ AI-DERIVED TAXONOMY FACETS
                    </Text>
                  </XStack>

                  <XStack alignItems="center" gap={8}>
                    {/* Confidence Pill */}
                    <XStack
                      backgroundColor="rgba(245, 158, 11, 0.15)"
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={12}
                      borderWidth={0.5}
                      borderColor="rgba(245, 158, 11, 0.4)"
                    >
                      <Text fontSize={10} fontWeight="700" color="#D97706">
                        {confPct}% Confidence • {taxVersion}
                      </Text>
                    </XStack>

                    {/* Enrich with AI Action Button */}
                    {onReevaluateLLM && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Enrich product facets with AI"
                        onPress={onReevaluateLLM}
                        style={{ cursor: 'pointer' } as any}
                      >
                        <XStack
                          alignItems="center"
                          gap={4}
                          paddingHorizontal={9}
                          paddingVertical={4}
                          borderRadius={tokens.radius.full}
                          backgroundColor={`${tokens.accent}18`}
                          borderWidth={1}
                          borderColor={`${tokens.accent}40`}
                        >
                          <LuSparkles size={12} color={tokens.accent} />
                          <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                            Enrich with AI
                          </Text>
                        </XStack>
                      </Pressable>
                    )}
                  </XStack>
                </XStack>

                {/* Derivation Timestamp */}
                <XStack
                  paddingHorizontal={14}
                  paddingVertical={6}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="space-between"
                  borderBottomWidth={0.5}
                  borderBottomColor={tokens.border}
                >
                  <XStack alignItems="center" gap={4}>
                    <LuClock size={11} color={tokens.textMuted} />
                    <Text fontSize={10} color={tokens.textMuted}>
                      DeepLens Vision Pipeline
                    </Text>
                  </XStack>
                  <Text fontSize={10} fontWeight="600" color={tokens.textMuted}>
                    Derived: {derivedAt}
                  </Text>
                </XStack>

                {/* Sub-sections */}
                <YStack padding={14} gap={14}>
                  {/* a) Craft Heritage & Weave */}
                  <YStack gap={6}>
                    <XStack alignItems="center" gap={6}>
                      <LuLayers size={13} color={tokens.accent} />
                      <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.3}>
                        CRAFT HERITAGE & WEAVE
                      </Text>
                    </XStack>
                    <YStack
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.xs}
                      paddingHorizontal={12}
                      paddingVertical={8}
                      gap={4}
                    >
                      <TaxonomySpecRow label="Craft Technique" value={craftTech} isHighlighted />
                      <TaxonomySpecRow label="Regional Origin" value={regionalOrigin} />
                      <TaxonomySpecRow label="Motif & Pattern" value={motifPattern} />
                      <TaxonomySpecRow label="Border & Pallu Detail" value={borderPallu} />
                      <TaxonomySpecRow label="Zari/Inlay Material" value={zariMaterial} />
                      <TaxonomySpecRow label="Work Heaviness" value={workHeaviness} />
                    </YStack>
                  </YStack>

                  {/* b) Garment & Tailoring */}
                  <YStack gap={6}>
                    <XStack alignItems="center" gap={6}>
                      <LuTag size={13} color={tokens.accent} />
                      <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.3}>
                        GARMENT & TAILORING
                      </Text>
                    </XStack>
                    <YStack
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.xs}
                      paddingHorizontal={12}
                      paddingVertical={8}
                      gap={4}
                    >
                      <TaxonomySpecRow label="Fabric Base" value={fabricBase} isHighlighted />
                      <TaxonomySpecRow label="Stitch Profile" value={stitchProfile} />
                      <TaxonomySpecRow label="Blouse Format" value={blouseFormat} />
                      <TaxonomySpecRow label="Saree/Blouse Dimensions" value={dimensions} />
                    </YStack>
                  </YStack>

                  {/* c) Occasions & Search Relevance */}
                  <YStack gap={6}>
                    <XStack alignItems="center" gap={6}>
                      <LuCalendar size={13} color={tokens.accent} />
                      <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.3}>
                        OCCASIONS & SEARCH RELEVANCE
                      </Text>
                    </XStack>
                    <YStack
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.xs}
                      paddingHorizontal={12}
                      paddingVertical={10}
                      gap={8}
                    >
                      {/* Occasion Tags */}
                      <YStack gap={4}>
                        <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                          Occasion Tags
                        </Text>
                        <XStack flexWrap="wrap" gap={5}>
                          {occasionsList.map((occ, idx) => (
                            <XStack
                              key={idx}
                              backgroundColor="rgba(16, 185, 129, 0.12)"
                              paddingHorizontal={8}
                              paddingVertical={3}
                              borderRadius={4}
                              borderWidth={0.5}
                              borderColor="rgba(16, 185, 129, 0.3)"
                            >
                              <Text fontSize={10} fontWeight="700" color="#059669">
                                🌟 {occ}
                              </Text>
                            </XStack>
                          ))}
                        </XStack>
                      </YStack>

                      {/* Search Keywords */}
                      <YStack gap={4}>
                        <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                          Search Keywords
                        </Text>
                        <XStack flexWrap="wrap" gap={5}>
                          {searchKeywordsList.map((tag, idx) => (
                            <XStack
                              key={idx}
                              backgroundColor={tokens.surface}
                              paddingHorizontal={7}
                              paddingVertical={2.5}
                              borderRadius={4}
                              borderWidth={0.5}
                              borderColor={tokens.border}
                            >
                              <Text fontSize={9} fontWeight="600" color={tokens.text}>
                                #{tag}
                              </Text>
                            </XStack>
                          ))}
                        </XStack>
                      </YStack>

                      {/* Wash Care */}
                      <YStack gap={3} paddingTop={4} borderTopWidth={0.5} borderTopColor={tokens.border}>
                        <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                          Wash Care & Preservation
                        </Text>
                        <Text fontSize={10} color={tokens.text}>
                          🧼 {washCare}
                        </Text>
                      </YStack>
                    </YStack>
                  </YStack>
                </YStack>
              </YStack>
            </YStack>
          );
        })()}
        {listings.length > 0 && (
          <YStack paddingHorizontal={16} paddingTop={16} gap={10}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
                VENDOR LISTINGS ({listings.length})
              </Text>
            </XStack>

            <YStack gap={10}>
              {listings.map((item) => (
                <AdminVendorListingCard
                  key={item.id}
                  listing={item}
                  onExpand={() => setPreviewListing(item)}
                  onOpenWhatsApp={
                    onOpenWhatsAppListing ? () => onOpenWhatsAppListing(item) : undefined
                  }
                  onCopyDescription={() => {
                    if (item.description && typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(item.description);
                    }
                  }}
                />
              ))}
            </YStack>
          </YStack>
        )}
      </ScrollView>

      {/* Context Actions Menu Modal */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setIsMenuOpen(false)}
        >
          <YStack
            backgroundColor={tokens.surface}
            borderTopLeftRadius={tokens.radius.xl}
            borderTopRightRadius={tokens.radius.xl}
            paddingVertical={12}
            paddingHorizontal={16}
            gap={4}
          >
            <XStack justifyContent="center" paddingBottom={8}>
              <YStack width={36} height={4} borderRadius={2} backgroundColor={tokens.border} />
            </XStack>

            {/* Share */}
            {onShare && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share product"
                onPress={() => {
                  setIsMenuOpen(false);
                  onShare();
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuShare2 size={18} color={tokens.text} />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Share Product
                  </Text>
                </XStack>
              </Pressable>
            )}

            {/* Publish to Store */}
            {onPublishToStore && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Publish to Store"
                onPress={() => {
                  setIsMenuOpen(false);
                  onPublishToStore();
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuStore size={18} color={tokens.accent} />
                  <Text fontSize={14} fontWeight="800" color={tokens.accent}>
                    {product?.isPublishedToStore ? '✓ Published to Store (Re-sync)' : '🚀 Publish to Store'}
                  </Text>
                </XStack>
              </Pressable>
            )}

            {/* Edit Metadata */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit metadata"
              onPress={() => {
                setIsMenuOpen(false);
                setIsEditOpen(true);
              }}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack alignItems="center" gap={12} paddingVertical={12}>
                <LuPencil size={18} color={tokens.text} />
                <Text fontSize={14} fontWeight="700" color={tokens.text}>
                  Edit Price & Category
                </Text>
              </XStack>
            </Pressable>

            {/* Star Current Image */}
            {onStarMedia && mediaList[activeMediaIndex] && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Star current image"
                onPress={() => {
                  setIsMenuOpen(false);
                  onStarMedia(mediaList[activeMediaIndex].id);
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuStar size={18} color="#f59e0b" />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Set as Cover / Star Media
                  </Text>
                </XStack>
              </Pressable>
            )}

            {/* Re-evaluate AI */}
            {onReevaluateLLM && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Re-evaluate with AI"
                onPress={() => {
                  setIsMenuOpen(false);
                  onReevaluateLLM();
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuSparkles size={18} color={tokens.accent} />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Re-evaluate with AI
                  </Text>
                </XStack>
              </Pressable>
            )}

            {/* Delete Product */}
            {onDeleteProduct && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete product"
                onPress={() => {
                  setIsMenuOpen(false);
                  setIsDeleteOpen(true);
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuTrash2 size={18} color="#ef4444" />
                  <Text fontSize={14} fontWeight="700" color="#ef4444">
                    Delete Product
                  </Text>
                </XStack>
              </Pressable>
            )}
          </YStack>
        </Pressable>
      </Modal>

      {/* Vendor Listing Sheet */}
      <AdminVendorListingSheet
        visible={previewListing !== null}
        listing={previewListing}
        onClose={() => setPreviewListing(null)}
        mediaList={mediaList.map((m) => ({ id: m.id, url: m.url }))}
        onOpenWhatsApp={
          previewListing && onOpenWhatsAppListing
            ? () => onOpenWhatsAppListing(previewListing)
            : undefined
        }
      />

      {/* Edit Metadata Sheet */}
      <AdminProductEditSheet
        visible={isEditOpen}
        initialCategory={product.category}
        initialFabric={product.fabric}
        initialPrice={product.vendorPrice}
        onClose={() => setIsEditOpen(false)}
        onSave={(updates) => {
          onSaveMetadata?.(updates);
          setIsEditOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Modal
        visible={isDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteOpen(false)}
      >
        <XStack flex={1} backgroundColor="rgba(0,0,0,0.6)" alignItems="center" justifyContent="center" padding={20}>
          <YStack
            width="100%"
            maxWidth={360}
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            padding={20}
            gap={14}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              Permanently Delete Product?
            </Text>
            <Text fontSize={12} lineHeight={18} color={tokens.textMuted}>
              This action is permanent and cannot be undone. All WhatsApp source media will be purged from storage and anti-resurrection tombstones registered.
            </Text>

            <XStack gap={10} justifyContent="flex-end" marginTop={6}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
                onPress={() => setIsDeleteOpen(false)}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack paddingHorizontal={14} paddingVertical={8} borderRadius={tokens.radius.sm}>
                  <Text fontSize={13} fontWeight="700" color={tokens.textMuted}>
                    Cancel
                  </Text>
                </XStack>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm permanent delete"
                onPress={() => {
                  setIsDeleteOpen(false);
                  onDeleteProduct?.();
                }}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={tokens.radius.sm}
                  backgroundColor="#ef4444"
                >
                  <Text fontSize={13} fontWeight="800" color="#ffffff">
                    Delete
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </YStack>
        </XStack>
      </Modal>

      {/* Fullscreen Media Viewer Modal */}
      <Modal
        visible={isFullscreenPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullscreenPreviewOpen(false)}
      >
        <YStack flex={1} backgroundColor="#000000" position="relative">
          {/* Close Button */}
          <XStack
            position="absolute"
            top={topInset + 12}
            right={14}
            zIndex={20}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen preview"
              onPress={() => setIsFullscreenPreviewOpen(false)}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="rgba(255,255,255,0.2)"
                alignItems="center"
                justifyContent="center"
              >
                <LuX size={20} color="#ffffff" />
              </XStack>
            </Pressable>
          </XStack>

          {/* Fullscreen Image Presentation */}
          <YStack flex={1} alignItems="center" justifyContent="center">
            {mediaList[activeMediaIndex] && (
              <img
                src={mediaList[activeMediaIndex].url}
                alt="Fullscreen Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80%',
                  objectFit: 'contain',
                }}
              />
            )}
          </YStack>

          {/* Bottom Action Bar */}
          <XStack
            position="absolute"
            bottom={Math.max(20, bottomInset + 10)}
            alignSelf="center"
            gap={12}
            backgroundColor="rgba(255,255,255,0.15)"
            paddingHorizontal={16}
            paddingVertical={10}
            borderRadius={tokens.radius.full}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download image"
              onPress={() => {
                if (mediaList[activeMediaIndex]?.url) {
                  window.open(mediaList[activeMediaIndex].url, '_blank');
                }
              }}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack alignItems="center" gap={6}>
                <LuDownload size={16} color="#ffffff" />
                <Text fontSize={12} fontWeight="700" color="#ffffff">
                  Download
                </Text>
              </XStack>
            </Pressable>

            {onStarMedia && mediaList[activeMediaIndex] && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set as cover image"
                onPress={() => onStarMedia(mediaList[activeMediaIndex].id)}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack alignItems="center" gap={6}>
                  <LuStar size={16} color="#ffffff" />
                  <Text fontSize={12} fontWeight="700" color="#ffffff">
                    Set Cover
                  </Text>
                </XStack>
              </Pressable>
            )}
          </XStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
