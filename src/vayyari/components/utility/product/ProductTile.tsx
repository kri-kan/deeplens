import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { VendorProduct } from '@/types/products';
import { productService } from '@/services/productService';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

interface ProductTileProps {
  item: VendorProduct;
  onPress: (item: VendorProduct) => void;
}

export const ProductTile: React.FC<ProductTileProps> = ({ item, onPress }) => {
  const media = item.media?.find((m: any) => m.isDefault) || item.media?.[0];
  let imageUri = 'https://via.placeholder.com/150';
  
  if (media) {
    if (media.id && media.id !== '00000000-0000-0000-0000-000000000000') {
      imageUri = productService.getThumbnailUrl(media.id, 'medium');
    } else if (media.path) {
      imageUri = productService.getThumbnailUrlByPath(media.path, 'medium');
    }
  }

  return (
    <TouchableOpacity 
      style={styles.tile}
      onPress={() => onPress(item)}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.overlay}>
        <Text style={styles.code}>{item.productCode || '---'}</Text>
        <Text style={styles.price}>₹{item.vendorPrice}</Text>
      </View>
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
});
