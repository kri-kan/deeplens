import React from 'react';
import { View } from 'react-native';
import { ProductCard, ProductCardImage } from '../../molecules/ProductCard/ProductCard';
import { SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';
import { useResponsive } from '../../../theme';

export type GridProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewsCount?: number;
  fabric?: string;
  color?: string;
  gradient?: [string, string];
  images?: ProductCardImage[];
  swatches?: Array<{
    id: string;
    label: string;
    template: SwatchTemplateType;
    primaryColor: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    colorCount?: 2 | 3 | 4;
  }>;
};

export type ProductGridProps = {
  products: GridProduct[];
  showArrows?: boolean;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onWishlistPress?: (id: string) => void;
};

export function ProductGrid({
  products,
  showArrows,
  onPress,
  onLongPress,
  onWishlistPress,
}: ProductGridProps) {
  const { isMobile, isTablet } = useResponsive();

  // Desktop: 4 equal columns (or 3 if viewport is tighter)
  // Tablet: 3 equal columns
  // Mobile: 2 equal columns
  // All rows maintain strictly identical card dimensions, regardless of item count in row.
  const gridColumns = isMobile
    ? 'repeat(2, minmax(0, 1fr))'
    : isTablet
    ? 'repeat(3, minmax(0, 1fr))'
    : 'repeat(4, minmax(0, 1fr))';

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: 16,
        padding: 16,
        width: '100%',
        boxSizing: 'border-box',
      } as any}
    >
      {products.map((p) => (
        <ProductCard
          key={p.id}
          id={p.id}
          name={p.name}
          price={p.price}
          originalPrice={p.originalPrice}
          rating={p.rating}
          gradient={p.gradient}
          images={p.images}
          swatches={p.swatches}
          showArrows={showArrows}
          onPress={() => onPress?.(p.id)}
          onLongPress={() => onLongPress?.(p.id)}
          onWishlistPress={() => onWishlistPress?.(p.id)}
        />
      ))}
    </View>
  );
}
