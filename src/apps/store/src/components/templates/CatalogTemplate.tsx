import React, { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useTheme, useResponsive } from '../../theme';

export type CatalogTemplateProps = {
  header: ReactNode;
  breadcrumbs?: ReactNode;
  filterSidebar?: ReactNode;
  isFilterSidebarExpanded?: boolean;
  summaryBar?: ReactNode;
  productGrid: ReactNode;
  pagination?: ReactNode;
  stickyBottomBar?: ReactNode;
  filterDrawerModal?: ReactNode;
  sortModal?: ReactNode;
  cartDrawer?: ReactNode;
};

export function CatalogTemplate({
  header,
  breadcrumbs,
  filterSidebar,
  isFilterSidebarExpanded = true,
  summaryBar,
  productGrid,
  pagination,
  stickyBottomBar,
  filterDrawerModal,
  sortModal,
  cartDrawer,
}: CatalogTemplateProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const isCompact = isMobile || isTablet;

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Top Header Slot */}
      {header}

      {/* Main Catalog Scrollable Canvas */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isCompact && stickyBottomBar ? 90 : 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack
          maxWidth={1240}
          width="100%"
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : isTablet ? 18 : 24}
          paddingTop={16}
          gap={18}
        >
          {/* Breadcrumbs Navigation */}
          {breadcrumbs}

          {/* 2-Column Catalog Body: Persistent Left Sidebar on Wide Area + Right Grid */}
          <XStack width="100%" gap={24} alignItems="flex-start">
            {/* Left Filter Sidebar: stays expanded if available area is wide */}
            {isDesktop && isFilterSidebarExpanded && filterSidebar ? (
              <YStack width={260} flexShrink={0}>
                {filterSidebar}
              </YStack>
            ) : null}

            {/* Right Main Column: Summary Bar + Product Grid */}
            <YStack flex={1} minWidth={0} gap={16}>
              {summaryBar}

              {/* Responsive Product Grid */}
              <YStack minHeight={400}>
                {productGrid}
              </YStack>

              {/* Pagination / Infinite Loader */}
              {pagination}
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>

      {/* Mobile / Tablet Sticky Bottom Sort & Filter Bar */}
      {isCompact && stickyBottomBar ? (
        <YStack position="absolute" bottom={0} left={0} right={0} zIndex={100}>
          {stickyBottomBar}
        </YStack>
      ) : null}

      {/* Left Filter Drawer (for mobile/tablet hamburger or overlay) */}
      {filterDrawerModal}

      {/* Sort Bottom Sheet */}
      {sortModal}

      {/* Slide-out Cart Drawer */}
      {cartDrawer}
    </YStack>
  );
}
