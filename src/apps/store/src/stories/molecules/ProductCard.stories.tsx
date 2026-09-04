import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ProductCard, ProductCardProps } from '../../components/molecules/ProductCard/ProductCard';
import { QuickPreviewModal, QuickPreviewProduct } from '../../components/organisms/QuickPreviewModal/QuickPreviewModal';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const SAMPLE_IMAGES = [
  { id: '1', label: 'Front Drape', gradient: ['#f3d6d8', '#cc8d9a'] as [string, string] },
  { id: '2', label: 'Zari Pallu Detail', gradient: ['#f8bbd0', '#ad1457'] as [string, string] },
  { id: '3', label: 'Pleat Texture', gradient: ['#fce4ec', '#d81b60'] as [string, string] },
  { id: '4', label: 'Silhouette View', gradient: ['#f06292', '#880e4f'] as [string, string] },
];

const SAMPLE_SWATCHES = [
  { id: 's1', label: 'Rose Pink', template: 'solid' as const, primaryColor: 'Rose Pink' },
  { id: 's2', label: 'Rose & Wine', template: 'multi-tone' as const, primaryColor: 'Rose Pink', secondaryColor: 'Wine Maroon' },
  { id: 's3', label: 'Rose & Gold Border', template: 'contrast-border' as const, primaryColor: 'Rose Pink', secondaryColor: 'Antique Gold' },
];

const meta: Meta<any> = {
  title: 'Molecules/ProductCard',
  component: ProductCard,
  args: {
    name: 'Rani Rose Banarasi Jacquard Saree',
    price: 2799,
    originalPrice: 4199,
    rating: 4.7,
    gradient: ['#f3d6d8', '#cc8d9a'],
    images: SAMPLE_IMAGES,
    swatches: SAMPLE_SWATCHES,
    isWishlisted: false,
    size: 'auto',
    ...THEME_ARGS,
  },
  argTypes: {
    price: { control: 'number' },
    originalPrice: { control: 'number' },
    isWishlisted: { control: 'boolean' },
    showArrows: {
      control: 'boolean',
      description: 'Toggle carousel arrows. Defaults to TRUE on desktop, FALSE on tablet & mobile (natural swipe).',
    },
    size: {
      control: 'select',
      options: ['auto', 'desktop', 'tablet', 'mobile'],
      description: 'Explicit device size preview preset.',
    },
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof ProductCard>;

export const Default: Story = {};

export const DesktopPreview: Story = {
  render: (args) => (
    <YStack padding={20} gap={10} width="100%" maxWidth={320}>
      <Text fontSize={13} fontWeight="800" color="#222">
        🖥️ Desktop Size Preview (~280px - 320px)
      </Text>
      <Text fontSize={12} color="#666">
        Arrows visible on hover, full title height (42px), standard wishlist button (34px).
      </Text>
      <ProductCard {...args} size="desktop" />
    </YStack>
  ),
};

export const TabletPreview: Story = {
  render: (args) => (
    <YStack padding={20} gap={10} width="100%" maxWidth={240}>
      <Text fontSize={13} fontWeight="800" color="#222">
        📱 Tablet Size Preview (~220px - 250px)
      </Text>
      <Text fontSize={12} color="#666">
        Arrows disabled by default (natural swipe gesture supported), proportional 210px canvas.
      </Text>
      <ProductCard {...args} size="tablet" />
    </YStack>
  ),
};

export const MobilePreview: Story = {
  render: (args) => (
    <YStack padding={20} gap={10} width="100%" maxWidth={180}>
      <Text fontSize={13} fontWeight="800" color="#222">
        📱 Mobile Size Preview (2-Col Grid ~160px - 180px)
      </Text>
      <Text fontSize={12} color="#666">
        Arrows disabled by default, compact padding, 180px canvas, swipeable.
      </Text>
      <ProductCard {...args} size="mobile" />
    </YStack>
  ),
};

export const ArrowsDisabledOnDesktop: Story = {
  args: {
    showArrows: false,
    size: 'desktop',
  },
  render: (args) => (
    <YStack padding={20} gap={10} width="100%" maxWidth={320}>
      <Text fontSize={13} fontWeight="800" color="#222">
        🚫 Arrows Explicitly Disabled (Clean Mode)
      </Text>
      <Text fontSize={12} color="#666">
        Arrows removed even on desktop view via showArrows=false. Pagination dots and swipe remain active.
      </Text>
      <ProductCard {...args} showArrows={false} size="desktop" />
    </YStack>
  ),
};

export const ArrowsForcedOnMobile: Story = {
  args: {
    showArrows: true,
    size: 'mobile',
  },
  render: (args) => (
    <YStack padding={20} gap={10} width="100%" maxWidth={180}>
      <Text fontSize={13} fontWeight="800" color="#222">
        ➡️ Arrows Explicitly Enabled on Mobile
      </Text>
      <Text fontSize={12} color="#666">
        Overridden with showArrows=true to show chevrons on compact mobile frame.
      </Text>
      <ProductCard {...args} showArrows={true} size="mobile" />
    </YStack>
  ),
};

export const ResponsiveDeviceComparison = (args: any) => {
  return (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ padding: 24, gap: 24 }}
    >
      <YStack gap={6}>
        <Text fontSize={20} fontWeight="900" color="#111">
          📐 Product Card Responsive Size Matrix
        </Text>
        <Text fontSize={13} color="#666">
          Notice how the card automatically adapts its canvas height, typography, wishlist button, and arrows across devices:
          Desktop has hover arrows; Tablet & Mobile disable arrows by default for natural touch swiping.
        </Text>
      </YStack>

      <XStack gap={20} alignItems="flex-start" flexWrap="wrap">
        {/* Desktop */}
        <YStack gap={8} width={280}>
          <XStack backgroundColor="#eee" paddingHorizontal={10} paddingVertical={4} borderRadius={6} alignSelf="flex-start">
            <Text fontSize={11} fontWeight="800" color="#333">1. DESKTOP (280px)</Text>
          </XStack>
          <Text fontSize={11} color="#777">
            • Arrows: Enabled on hover{"\n"}
            • Image Height: 230px{"\n"}
            • Title: 15px / 20px line height
          </Text>
          <ProductCard
            name="Rani Rose Banarasi Jacquard Saree"
            price={2799}
            originalPrice={4199}
            rating={4.7}
            images={SAMPLE_IMAGES}
            swatches={SAMPLE_SWATCHES}
            size="desktop"
          />
        </YStack>

        {/* Tablet */}
        <YStack gap={8} width={230}>
          <XStack backgroundColor="#eee" paddingHorizontal={10} paddingVertical={4} borderRadius={6} alignSelf="flex-start">
            <Text fontSize={11} fontWeight="800" color="#333">2. TABLET (230px)</Text>
          </XStack>
          <Text fontSize={11} color="#777">
            • Arrows: Disabled by default{"\n"}
            • Image Height: 210px{"\n"}
            • Title: 14px / 19px line height
          </Text>
          <ProductCard
            name="Rani Rose Banarasi Jacquard Saree"
            price={2799}
            originalPrice={4199}
            rating={4.7}
            images={SAMPLE_IMAGES}
            swatches={SAMPLE_SWATCHES}
            size="tablet"
          />
        </YStack>

        {/* Mobile */}
        <YStack gap={8} width={175}>
          <XStack backgroundColor="#eee" paddingHorizontal={10} paddingVertical={4} borderRadius={6} alignSelf="flex-start">
            <Text fontSize={11} fontWeight="800" color="#333">3. MOBILE (175px)</Text>
          </XStack>
          <Text fontSize={11} color="#777">
            • Arrows: Disabled by default{"\n"}
            • Image Height: 180px{"\n"}
            • Title: 13px / 18px line height
          </Text>
          <ProductCard
            name="Rani Rose Banarasi Jacquard Saree"
            price={2799}
            originalPrice={4199}
            rating={4.7}
            images={SAMPLE_IMAGES}
            swatches={SAMPLE_SWATCHES}
            size="mobile"
          />
        </YStack>
      </XStack>
    </ScrollView>
  );
};

export const InteractiveWithQuickPreview = (args: any) => {
  const [wishlisted, setWishlisted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sampleProduct: QuickPreviewProduct = {
    id: 'sample-1',
    name: 'Royal Heritage Midnight Silk Saree',
    price: 3499,
    originalPrice: 5299,
    rating: 4.9,
    reviewsCount: 184,
    fabric: 'Organza',
    gradient: ['#dfe4f2', '#8aa0d7'],
    images: [
      { id: '1', label: 'Regal Front Drape', gradient: ['#dfe4f2', '#8aa0d7'] },
      { id: '2', label: 'Pallu Silver Zari', gradient: ['#1565c0', '#e0e0e0'] },
      { id: '3', label: 'Organza Sheer Weave', gradient: ['#bbdefb', '#0d47a1'] },
      { id: '4', label: 'Tassel Border Silhouette', gradient: ['#0a2558', '#3f51b5'] },
    ],
    swatches: [
      { id: 's1', label: 'Royal Blue', template: 'solid', primaryColor: 'Royal Blue' },
      { id: 's2', label: 'Azure & Teal Shimmer', template: 'multi-tone', primaryColor: 'Royal Blue', secondaryColor: 'Teal Peacock' },
      { id: 's3', label: 'Peacock 3-Color Pie', template: 'multi-shade', primaryColor: 'Royal Blue', secondaryColor: 'Emerald', tertiaryColor: 'Antique Gold', colorCount: 3 },
    ],
  };

  return (
    <YStack gap={16} padding={20} maxWidth={320}>
      <Text fontSize={13} color="#666">
        💡 <Text fontWeight="800" color="#222">Desktop:</Text> Hover and click the 👁 eye icon (no text) to open Quick Preview. Simple click anywhere on the card always navigates to PDP!
      </Text>
      <ProductCard
        name={sampleProduct.name}
        price={sampleProduct.price}
        originalPrice={sampleProduct.originalPrice}
        rating={sampleProduct.rating}
        images={sampleProduct.images}
        swatches={sampleProduct.swatches}
        isWishlisted={wishlisted}
        onPress={() => alert(`Simple click: Navigating to PDP for "${sampleProduct.name}"`)}
        onWishlistPress={() => setWishlisted((w) => !w)}
        onQuickPreview={() => setPreviewOpen(true)}
      />

      <QuickPreviewModal
        open={previewOpen}
        product={sampleProduct}
        onClose={() => setPreviewOpen(false)}
        onAddToCart={() => alert('Added to Bag!')}
        onViewDetails={(name) => alert(`Navigating to PDP for ${name}`)}
      />
    </YStack>
  );
};
