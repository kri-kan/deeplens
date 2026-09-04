import React, { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useTheme, useResponsive } from '../../theme';

export type ProductDetailTemplateProps = {
  header: ReactNode;
  breadcrumbs?: ReactNode;
  gallery: ReactNode;
  purchasePanel: ReactNode;
  crossSells?: ReactNode;
  specifications?: ReactNode;
  reviews?: ReactNode;
  recommendations?: ReactNode;
  stickyBuyBar?: ReactNode;
  cartDrawer?: ReactNode;
  onScroll?: (e: any) => void;
};

export function ProductDetailTemplate({
  header,
  breadcrumbs,
  gallery,
  purchasePanel,
  crossSells,
  specifications,
  reviews,
  recommendations,
  stickyBuyBar,
  cartDrawer,
  onScroll,
}: ProductDetailTemplateProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Sticky / Top Header */}
      {header}

      {/* Main PDP Scrollable Canvas */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isMobile ? 110 : 60,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <YStack
          maxWidth={1240}
          width="100%"
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : isTablet ? 20 : 28}
          paddingTop={isMobile ? 12 : 20}
          gap={isMobile ? 20 : 32}
        >
          {/* Breadcrumbs Navigation */}
          {breadcrumbs}

          {/* Primary Showcase Split */}
          {isDesktop ? (
            <XStack flexDirection="row" alignItems="flex-start" gap={32} width="100%">
              {/* Gallery Column (Left, 55%) */}
              <YStack flex={1.1} minWidth={0}>
                {gallery}
              </YStack>

              {/* Purchase Panel Column (Right, 45%) */}
              <YStack flex={0.9} minWidth={0} gap={20}>
                {purchasePanel}
              </YStack>
            </XStack>
          ) : (
            /* Tablet & Mobile: Stack Gallery on Top, Purchase Panel Below */
            <YStack flexDirection="column" gap={isMobile ? 16 : 24} width="100%">
              <YStack width="100%">
                {gallery}
              </YStack>
              <YStack width="100%" gap={16}>
                {purchasePanel}
              </YStack>
            </YStack>
          )}

          {/* Cross-sells / Frequently Bought Together Bundle */}
          {crossSells ? (
            <YStack width="100%">
              {crossSells}
            </YStack>
          ) : null}

          {/* Specifications & Craft Details Table */}
          {specifications ? (
            <YStack width="100%">
              {specifications}
            </YStack>
          ) : null}

          {/* Customer Reviews & Ratings Breakdown */}
          {reviews ? (
            <YStack width="100%">
              {reviews}
            </YStack>
          ) : null}

          {/* Similar Products Recommendation Strip */}
          {recommendations ? (
            <YStack width="100%">
              {recommendations}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>

      {/* Mobile Sticky Add to Bag Floating Bar */}
      {isMobile ? stickyBuyBar : null}

      {/* Slide-out Cart Drawer */}
      {cartDrawer}
    </YStack>
  );
}
