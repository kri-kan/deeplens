import React, { useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
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
} from '../icons/lu';
import { useTheme } from '@/theme';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  media?: MediaSlideItem[];
  listings?: VendorListingItemData[];
}

export interface AdminProductDetailPageProps {
  product?: AdminProductDetailData | null;
  onBack?: () => void;
  onFindSimilar?: () => void;
  onShare?: () => void;
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
  onDownloadMedia?: (media: MediaSlideItem) => void;
  isLoading?: boolean;
  disableSafeArea?: boolean;
  initialViewMode?: 'carousel' | 'gallery';
  initialListingSheetOpen?: boolean;
  initialEditSheetOpen?: boolean;
  initialDeleteDialogOpen?: boolean;
}

export function AdminProductDetailPage({
  product,
  onBack,
  onFindSimilar,
  onShare,
  onStarMedia,
  onReevaluateLLM,
  onDeleteProduct,
  onUnarchive,
  onSaveMetadata,
  onOpenWhatsAppListing,
  onDownloadMedia,
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
            onPress={onBack}
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
          </TouchableOpacity>
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
        {/* Back Button */}
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Navigate back"
            activeOpacity={0.7}
            onPress={onBack}
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
          </TouchableOpacity>
        ) : (
          <XStack width={36} />
        )}

        {/* Right Header Action Icons */}
        <XStack alignItems="center" gap={8}>
          {/* Find Similar Matches */}
          {onFindSimilar && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Find similar products"
              activeOpacity={0.7}
              onPress={onFindSimilar}
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
            </TouchableOpacity>
          )}

          {/* View Mode Toggle */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle media presentation mode"
            activeOpacity={0.7}
            onPress={() => setViewMode((m) => (m === 'carousel' ? 'gallery' : 'carousel'))}
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
          </TouchableOpacity>

          {/* 3-Dots Context Menu Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open options menu"
            activeOpacity={0.7}
            onPress={() => setIsMenuOpen(true)}
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
          </TouchableOpacity>
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

        {/* Vendor Listings Section */}
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
                    // Handled in screen
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
        <TouchableOpacity
          activeOpacity={1}
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
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Share product"
                activeOpacity={0.7}
                onPress={() => {
                  setIsMenuOpen(false);
                  onShare();
                }}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuShare2 size={18} color={tokens.text} />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Share Product
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}

            {/* Edit Metadata */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit metadata"
              activeOpacity={0.7}
              onPress={() => {
                setIsMenuOpen(false);
                setIsEditOpen(true);
              }}
            >
              <XStack alignItems="center" gap={12} paddingVertical={12}>
                <LuPencil size={18} color={tokens.text} />
                <Text fontSize={14} fontWeight="700" color={tokens.text}>
                  Edit Price & Category
                </Text>
              </XStack>
            </TouchableOpacity>

            {/* Star Current Image */}
            {onStarMedia && mediaList[activeMediaIndex] && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Star current image"
                activeOpacity={0.7}
                onPress={() => {
                  setIsMenuOpen(false);
                  onStarMedia(mediaList[activeMediaIndex].id);
                }}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuStar size={18} color="#f59e0b" />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Set as Cover / Star Media
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}

            {/* Re-evaluate AI */}
            {onReevaluateLLM && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Re-evaluate with AI"
                activeOpacity={0.7}
                onPress={() => {
                  setIsMenuOpen(false);
                  onReevaluateLLM();
                }}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuSparkles size={18} color={tokens.accent} />
                  <Text fontSize={14} fontWeight="700" color={tokens.text}>
                    Re-evaluate with AI
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}

            {/* Delete Product */}
            {onDeleteProduct && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Delete product"
                activeOpacity={0.7}
                onPress={() => {
                  setIsMenuOpen(false);
                  setIsDeleteOpen(true);
                }}
              >
                <XStack alignItems="center" gap={12} paddingVertical={12}>
                  <LuTrash2 size={18} color="#ef4444" />
                  <Text fontSize={14} fontWeight="700" color="#ef4444">
                    Delete Product
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}
          </YStack>
        </TouchableOpacity>
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
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
                activeOpacity={0.7}
                onPress={() => setIsDeleteOpen(false)}
              >
                <XStack paddingHorizontal={14} paddingVertical={8} borderRadius={tokens.radius.sm}>
                  <Text fontSize={13} fontWeight="700" color={tokens.textMuted}>
                    Cancel
                  </Text>
                </XStack>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm permanent delete"
                activeOpacity={0.8}
                onPress={() => {
                  setIsDeleteOpen(false);
                  onDeleteProduct?.();
                }}
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
              </TouchableOpacity>
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen preview"
              activeOpacity={0.7}
              onPress={() => setIsFullscreenPreviewOpen(false)}
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
            </TouchableOpacity>
          </XStack>

          {/* Fullscreen Image Presentation */}
          <YStack flex={1} alignItems="center" justifyContent="center">
            {mediaList[activeMediaIndex] && (
              <Image
                source={{ uri: mediaList[activeMediaIndex].url }}
                style={{
                  width: '100%',
                  height: '80%',
                }}
                contentFit="contain"
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
            {onDownloadMedia && mediaList[activeMediaIndex] && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Download image"
                activeOpacity={0.7}
                onPress={() => onDownloadMedia(mediaList[activeMediaIndex])}
              >
                <XStack alignItems="center" gap={6}>
                  <LuDownload size={16} color="#ffffff" />
                  <Text fontSize={12} fontWeight="700" color="#ffffff">
                    Download
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}

            {onStarMedia && mediaList[activeMediaIndex] && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Set as cover image"
                activeOpacity={0.7}
                onPress={() => onStarMedia(mediaList[activeMediaIndex].id)}
              >
                <XStack alignItems="center" gap={6}>
                  <LuStar size={16} color="#ffffff" />
                  <Text fontSize={12} fontWeight="700" color="#ffffff">
                    Set Cover
                  </Text>
                </XStack>
              </TouchableOpacity>
            )}
          </XStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
