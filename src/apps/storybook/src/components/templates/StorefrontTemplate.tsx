import React, { ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../theme';

export type StorefrontTemplateProps = {
  header: ReactNode;
  hero: ReactNode;
  categories?: ReactNode;
  featured?: ReactNode;
  collections?: ReactNode;
  trustBadges?: ReactNode;
  footer?: ReactNode;
  cartDrawer?: ReactNode;
};

export function StorefrontTemplate({
  header,
  hero,
  categories,
  featured,
  collections,
  trustBadges,
  footer,
  cartDrawer,
}: StorefrontTemplateProps) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Sticky / Top Header */}
      {header}

      {/* Main Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack
          maxWidth={1240}
          width="100%"
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : 24}
          paddingTop={16}
          gap={32}
        >
          {/* Hero Banner Slot */}
          {hero}

          {/* Categories Strip Slot */}
          {categories ? (
            <YStack gap={10}>
              {categories}
            </YStack>
          ) : null}

          {/* Featured Highlights / Bento Slot */}
          {featured ? (
            <YStack gap={14}>
              {featured}
            </YStack>
          ) : null}

          {/* Curated Product Collections Slot */}
          {collections ? (
            <YStack gap={20}>
              {collections}
            </YStack>
          ) : null}

          {/* Trust Badges / Policies Slot */}
          {trustBadges ? (
            <YStack gap={12}>
              {trustBadges}
            </YStack>
          ) : null}

          {/* Footer Slot */}
          {footer}
        </YStack>
      </ScrollView>

      {/* Slide-out / Floating Cart Drawer */}
      {cartDrawer}
    </YStack>
  );
}
