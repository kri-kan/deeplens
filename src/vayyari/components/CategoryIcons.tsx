import React from 'react';
import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import type { ProductCategory, CategoryDefinition } from '../types/products';

interface IconProps {
  color: string;
  size?: number;
}

interface CategoryIconProps extends IconProps {
  category: ProductCategory;
}

/**
 * IconWrapper provides a consistent, high-contrast container for icons.
 * Since the uploaded SVGs are black silhouettes with raster data,
 * this ensures they are visible on both light and dark backgrounds.
 */
const IconWrapper = ({ children, size }: { children: React.ReactNode; size: number }) => (
  <View style={[styles.wrapper, { width: size + 12, height: size + 12 }]}>
    {children}
  </View>
);

/**
 * Static registry of all product categories.
 * Add a new entry here to support a new category — no new component needed.
 */
export const CATEGORY_REGISTRY: CategoryDefinition[] = [
  { id: 'saree',   label: 'Saree',   assetPath: require('../assets/images/saree.svg') },
  { id: 'dress',   label: 'Dress',   assetPath: require('../assets/images/dress.svg') },
  { id: 'lehanga', label: 'Lehanga', assetPath: require('../assets/images/lehanga.svg') },
  { id: 'kids',    label: 'Kids',    assetPath: require('../assets/images/kids.svg') },
  { id: 'general', label: 'Others',  assetPath: require('../assets/images/others.svg') },
];

/** Quick lookup map: category id → asset path */
const CATEGORY_ASSET_MAP = Object.fromEntries(
  CATEGORY_REGISTRY.map((c) => [c.id, c.assetPath])
) as Record<ProductCategory, ReturnType<typeof require>>;

/**
 * Renders the appropriate category icon for a given category slug.
 * This replaces the five individually named icon components (SareeIcon, DressIcon, …).
 *
 * @example
 * <CategoryIcon category="saree" color={theme.colors.primary} size={32} />
 */
export const CategoryIcon = ({ category, color, size = 32 }: CategoryIconProps) => {
  const asset = CATEGORY_ASSET_MAP[category] ?? CATEGORY_ASSET_MAP['general'];
  return (
    <IconWrapper size={size}>
      <Image
        source={asset}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor={color}
      />
    </IconWrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF', // High-contrast solid white circle
    borderRadius: 24,           // Circular for size ~32
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow to lift it off the background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
});
