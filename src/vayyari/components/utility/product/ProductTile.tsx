import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Image } from 'expo-image';
import { VendorProduct, MediaEntry } from '@/types/products';
import { productService } from '@/services/productService';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

interface ProductTileProps {
  item: VendorProduct;
  onPress: (item: VendorProduct) => void;
  onLongPress?: (item: VendorProduct) => void;
  selected?: boolean;
  sizeRatio?: number;
}

export const ProductTile: React.FC<ProductTileProps> = ({ item, onPress, onLongPress, selected, sizeRatio = 1 }) => {
  const theme = useTheme();
  
  // Robust media list extraction
  let mediaList: MediaEntry[] = [];
  
  if (Array.isArray(item.media) && item.media.length > 0) {
    mediaList = item.media;
  } else if (item.mediaMap) {
    // If we only have a map, we might need to construct entries (fallback)
    mediaList = Object.entries(item.mediaMap).map(([vendorId, internalId]) => ({
      id: internalId,
      storagePath: '', // Unknown path
      isDefault: false
    }));
  }

  // Robust property access (handling both PascalCase from raw SQL and camelCase from DTOs)
  const getProp = (obj: any, camel: string, pascal: string) => obj[camel] !== undefined ? obj[camel] : obj[pascal];

  // Find default or first media
  const media = mediaList.find(m => getProp(m, 'isDefault', 'IsDefault')) || mediaList[0];

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

  return (
    <TouchableOpacity 
      style={[
        styles.tile,
      ]}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { backgroundColor: theme.colors.surfaceVariant }]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay}>
        <Text style={styles.code}>{productCode} • {listingCount} listings</Text>
        <Text style={styles.price}>₹{vendorPrice}</Text>
      </View>
      {selected && (
        <View style={styles.selectedOverlay}>
          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 24}}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
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
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
