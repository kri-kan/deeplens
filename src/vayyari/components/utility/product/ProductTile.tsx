import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Animated } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { Image } from 'expo-image';
import { VendorProduct, MediaEntry } from '@/types/products';
import { productService } from '@/services/productService';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

interface ProductTileProps {
  item: VendorProduct;
  onPress: (item: VendorProduct) => void;
  onLongPress?: (item: VendorProduct) => void;
  onDragStart?: () => void;
  onToggleStar?: (item: VendorProduct, isStarred: boolean) => void;
  selected?: boolean;
  selectionMode?: boolean;
  sizeRatio?: number;
}

const ProductTileComponent: React.FC<ProductTileProps> = ({ item, onPress, onLongPress, onDragStart, onToggleStar, selected, selectionMode = false, sizeRatio = 1 }) => {
  const theme = useTheme();

  // Animated value for selection overlay — drives opacity instantly for snappy feel
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

  // Robust property access (handling both PascalCase from raw SQL and camelCase from DTOs)
  const getProp = (obj: any, camel: string, pascal: string) => obj[camel] !== undefined ? obj[camel] : obj[pascal];

  // 1. First default image
  let media = mediaList.find(m => getProp(m, 'isDefault', 'IsDefault') && getProp(m, 'mediaType', 'MediaType') === 1);
  // 2. First image
  if (!media) media = mediaList.find(m => getProp(m, 'mediaType', 'MediaType') === 1);
  // 3. First default media (could be video)
  if (!media) media = mediaList.find(m => getProp(m, 'isDefault', 'IsDefault'));
  // 4. Fallback to first available media
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

  const overlayOpacity = selectionAnim;
  const circleScale = selectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Pressable
      style={styles.tile}
      onPress={() => onPress?.(item)}
      onLongPress={() => {
        onLongPress?.(item);
        onDragStart?.();
      }}
      // Allow parent to hijack touches when drag selecting starts
      onStartShouldSetResponder={() => true}
      android_ripple={selectionMode ? null : { color: 'rgba(255,255,255,0.2)' }}
    >
      {({ pressed }) => (
        <>
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { backgroundColor: theme.colors.surfaceVariant, opacity: pressed && !selectionMode ? 0.85 : 1 }]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />

          {/* Star icon — top LEFT (hidden in selection mode) */}
          {onToggleStar && !selectionMode && (
            <View style={styles.starIconContainer}>
              <IconButton
                icon={item.isStarred ? 'star' : 'star-outline'}
                iconColor={item.isStarred ? '#FFD700' : 'white'}
                size={18}
                onPress={() => onToggleStar(item, !item.isStarred)}
                style={styles.starIcon}
              />
            </View>
          )}

          {/* Selection circle — top RIGHT */}
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
                  : { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.8)' },
              ]}
            >
              {selected && (
                <View style={styles.selectionCheckDot} />
              )}
            </View>
          </Animated.View>

          {/* Selection colour wash over the image */}
          <Animated.View
            style={[styles.selectedOverlay, { opacity: overlayOpacity }]}
            pointerEvents="none"
          />

          <View style={styles.overlay}>
            <Text style={styles.code}>{productCode} • {listingCount} listings</Text>
            <Text style={styles.price}>₹{vendorPrice}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.3,
    padding: 0.5,
  },
  image: {
    flex: 1,
  },
  // Star moved to TOP LEFT
  starIconContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
  },
  starIcon: {
    margin: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  // Circle indicator — TOP RIGHT
  selectionCircleContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 80, 0.35)',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  code: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  price: {
    color: 'white',
    fontSize: 10,
  },
});

export const ProductTile = React.memo(ProductTileComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.selected === next.selected &&
    prev.selectionMode === next.selectionMode &&
    prev.item.isStarred === next.item.isStarred &&
    prev.sizeRatio === next.sizeRatio
  );
});
