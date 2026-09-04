import React, { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useTheme, useResponsive } from '../../theme';

export type CartTemplateProps = {
  header: ReactNode;
  pincodeChecker?: ReactNode;
  selectionHeader?: ReactNode;
  itemList: ReactNode;
  loginBanner?: ReactNode;
  crossSellRail?: ReactNode;
  couponSection: ReactNode;
  artisanDonation?: ReactNode;
  priceDetails: ReactNode;
  stickyBottomBar?: ReactNode;
  isEmpty?: boolean;
  emptyState?: ReactNode;
};

export function CartTemplate({
  header,
  pincodeChecker,
  selectionHeader,
  itemList,
  loginBanner,
  crossSellRail,
  couponSection,
  artisanDonation,
  priceDetails,
  stickyBottomBar,
  isEmpty = false,
  emptyState,
}: CartTemplateProps) {
  const { tokens } = useTheme();
  const { isMobile, isDesktop } = useResponsive();

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Header Slot */}
      {header}

      {isEmpty ? (
        emptyState
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: isMobile ? 120 : 60,
          }}
        >
          <XStack
            width="100%"
            maxWidth={1240}
            alignSelf="center"
            paddingHorizontal={isMobile ? 12 : 24}
            paddingTop={20}
            gap={24}
            flexDirection={isDesktop ? 'row' : 'column'}
            alignItems="flex-start"
          >
            {/* Left Column: Items */}
            <YStack flex={isDesktop ? 1.6 : undefined} width="100%" gap={16}>
              {pincodeChecker}
              {selectionHeader}
              {itemList}
              {loginBanner}
              {crossSellRail}
            </YStack>

            {/* Right Column: Pricing & Checkout */}
            <YStack
              flex={isDesktop ? 1 : undefined}
              width="100%"
              gap={16}
              position={isDesktop ? 'sticky' as any : undefined}
              top={isDesktop ? 80 : undefined}
            >
              {couponSection}
              {artisanDonation}
              {priceDetails}
            </YStack>
          </XStack>
        </ScrollView>
      )}

      {/* Sticky Bottom Bar (Mobile) */}
      {isMobile && !isEmpty && stickyBottomBar}
    </YStack>
  );
}
