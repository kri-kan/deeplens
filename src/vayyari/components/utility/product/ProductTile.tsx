import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Animated } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { Image } from 'expo-image';
import { VendorProduct, MediaEntry } from '@/types/products';
import { productService } from '@/services/productService';
import { formatISTTimestamp } from '@/utils/date-format';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

interface ProductTileProps {
  item: VendorProduct;
  onPress: (item: VendorProduct) => void;
  onLongPress?: (item: VendorProduct) => void;
  onLongPressPriceCategory?: (item: VendorProduct) => void;
  onDragStart?: () => void;
  onToggleStar?: (item: VendorProduct, isStarred: boolean) => void;
  selected?: boolean;
  selectionMode?: boolean;
  sizeRatio?: number;
  tileWidth?: number;
  tileHeight?: number;
}

const ProductTileComponent: React.FC<ProductTileProps> = ({
  item,
  onPress,
  onLongPress,
  onLongPressPriceCategory,
  onDragStart,
  onToggleStar,
  selected,
  selectionMode = false,
  tileWidth,
  tileHeight,
}) => {
  const theme = useTheme();

  // Animated selection overlay
  const selectionAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: selected ? 1 : 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  // Robust media list extraction
  let mediaList: MediaEntry[] = [];

  if (Array.isArray(item.media) && item.media.length > 0) {
    mediaList = item.media;
  } else if (item.mediaMap) {
    mediaList = Object.entries(item.mediaMap).map(([vendorId, internalId]) => ({
      id: internalId,
      storagePath: '',
      isDefault: false,
    }));
  }

  const getProp = (obj: any, camel: string, pascal: string) => obj[camel] !== undefined ? obj[camel] : obj[pascal];

  let media = mediaList.find(m => getProp(m, 'isDefault', 'IsDefault') && getProp(m, 'mediaType', 'MediaType') === 1);
  if (!media) media = mediaList.find(m => getProp(m, 'mediaType', 'MediaType') === 1);
  if (!media) media = mediaList.find(m => getProp(m, 'isDefault', 'IsDefault'));
  if (!media) media = mediaList[0];
  let imageUri = 'https://via.placeholder.com/150?text=No+Image';

  if (media) {
    const mId = getProp(media, 'id', 'Id');
    const mPath = getProp(media, 'storagePath', 'StoragePath');

    if (mId && mId !== '00000000-0000-0000-0000-000000000000') {
      imageUri = productService.getThumbnailUrl(mId, 'medium');
    } else if (mPath) {
      imageUri = productService.getThumbnailUrlByPath(mPath, 'medium');
    }
  }

  const productCode = getProp(item, 'productCode', 'ProductCode') || '---';
  const listingCount = getProp(item, 'listingCount', 'ListingCount') || 0;
  const vendorPrice = getProp(item, 'vendorPrice', 'VendorPrice');
  const createdAt = getProp(item, 'createdAt', 'CreatedAt');
  const sourceGroupId = getProp(item, 'sourceGroupId', 'SourceGroupId');
  const formattedTime = formatISTTimestamp(createdAt, sourceGroupId);
  const categoryName = getProp(item, 'category', 'Category') || 'General';

  // Calculate card dimensions
  const cardW = tileWidth || Math.floor((WINDOW_WIDTH - 24) / 3);
  const cardH = tileHeight || Math.floor(cardW * 1.4);
  const imageHeight = Math.floor(cardH * 0.66);

  const overlayOpacity = selectionAnim;
  const circleScale = selectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Pressable
      style={[
        styles.cardContainer,
        {
          width: cardW,
          height: cardH,
          backgroundColor: theme.colors.elevation.level1,
          borderColor: selected ? theme.colors.primary : 'rgba(0,0,0,0.08)',
        },
      ]}
      onPress={() => onPress?.(item)}
      onLongPress={() => {
        onLongPress?.(item);
        onDragStart?.();
      }}
      onStartShouldSetResponder={() => true}
      android_ripple={selectionMode ? null : { color: 'rgba(0,0,0,0.05)' }}
    >
      {({ pressed }) => (
        <View style={styles.cardInner}>
          {/* Image Container */}
          <View style={[styles.imageContainer, { height: imageHeight }]}>
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.image,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  opacity: pressed && !selectionMode ? 0.85 : 1,
                },
              ]}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />

            {/* Star Icon — Top Left */}
            {onToggleStar && !selectionMode && (
              <View style={styles.starIconContainer}>
                <IconButton
                  icon={item.isStarred ? 'star' : 'star-outline'}
                  iconColor={item.isStarred ? '#FFD700' : 'white'}
                  size={16}
                  onPress={() => onToggleStar(item, !item.isStarred)}
                  style={styles.starIcon}
                />
              </View>
            )}

            {/* Selection Circle — Top Right */}
            <Animated.View
              style={[
                styles.selectionCircleContainer,
                { transform: [{ scale: circleScale }] },
              ]}
            >
              <View
                style={[
                  styles.selectionCircle,
                  selected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.9)' },
                ]}
              >
                {selected && <View style={styles.selectionCheckDot} />}
              </View>
            </Animated.View>

            {/* Selection Colour Overlay */}
            <Animated.View
              style={[styles.selectedOverlay, { opacity: overlayOpacity }]}
              pointerEvents="none"
            />

            {/* Bottom-Left Image Rating / Stats Pill */}
            <View style={styles.imageBadgePill}>
              <Text style={styles.imageBadgeText} numberOfLines={1}>
                {listingCount > 0 ? `${listingCount}L` : 'Catalog'} • {formattedTime || 'Now'}
              </Text>
            </View>
          </View>

          {/* Card Body Below Image */}
          <View style={styles.cardBody}>
            <Text
              style={[styles.productTitle, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {productCode}
            </Text>
            <Text
              style={[styles.categorySubtitle, { color: theme.colors.outline }]}
              numberOfLines={1}
            >
              {categoryName}
            </Text>

            <View style={styles.priceRow}>
              <Pressable
                onLongPress={() => onLongPressPriceCategory?.(item)}
                delayLongPress={300}
                hitSlop={6}
                style={styles.pricePressable}
              >
                <Text
                  style={[styles.priceText, { color: theme.colors.primary }]}
                  numberOfLines={1}
                >
                  ₹{vendorPrice ?? '---'}{' '}
                  <Text style={[styles.editPencil, { color: theme.colors.outline }]}>✎</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  starIconContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
  },
  starIcon: {
    margin: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  selectionCircleContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  selectionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'white',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  imageBadgePill: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  categorySubtitle: {
    fontSize: 10,
    marginTop: 1,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  pricePressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editPencil: {
    fontSize: 9,
    opacity: 0.7,
  },
});

export const ProductTile = React.memo(ProductTileComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.selected === next.selected &&
    prev.selectionMode === next.selectionMode &&
    prev.item.isStarred === next.item.isStarred &&
    prev.item.createdAt === next.item.createdAt &&
    prev.item.vendorPrice === next.item.vendorPrice &&
    prev.tileWidth === next.tileWidth &&
    prev.tileHeight === next.tileHeight &&
    prev.sizeRatio === next.sizeRatio
  );
});
