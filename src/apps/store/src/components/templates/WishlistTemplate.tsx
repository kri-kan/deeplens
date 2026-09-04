import React, { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useTheme, useResponsive } from '../../theme';

export type WishlistTemplateProps = {
  header: ReactNode;
  topNav?: ReactNode;
  titleBanner: ReactNode;
  filterPills?: ReactNode;
  grid: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  cartDrawer?: ReactNode;
};

export function WishlistTemplate({
  header,
  topNav,
  titleBanner,
  filterPills,
  grid,
  emptyState,
  isEmpty = false,
  cartDrawer,
}: WishlistTemplateProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  return (
    <YStack flex={1} minHeight="100%" backgroundColor={tokens.background} position="relative">
      {/* Top Header Slots */}
      {header}
      {!isMobile && topNav}

      {/* Main Content Area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 60,
        }}
      >
        <YStack
          width="100%"
          maxWidth={1240}
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : 24}
          paddingTop={24}
          gap={20}
        >
          {titleBanner}
          {!isEmpty && filterPills}
          {isEmpty ? emptyState : grid}
        </YStack>
      </ScrollView>

      {/* Cart Drawer Slot */}
      {cartDrawer}
    </YStack>
  );
}
