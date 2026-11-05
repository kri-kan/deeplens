import React, { ReactNode, useState, useCallback, createContext } from 'react';
import { ScrollView, View } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useTheme, useResponsive } from '../../theme';

export type FocusModeContextType = {
  isFocusMode: boolean;
  setFocusMode: (inFocus: boolean) => void;
  setFocusOverlay: (overlay: ReactNode) => void;
};

export const FocusModeContext = createContext<FocusModeContextType>({
  isFocusMode: false,
  setFocusMode: () => {},
  setFocusOverlay: () => {},
});

export type ProductDetailTemplateProps = {
  header?: ReactNode;
  breadcrumbs?: ReactNode;
  gallery: ReactNode;
  purchasePanel: ReactNode;
  crossSells?: ReactNode;
  specifications?: ReactNode;
  reviews?: ReactNode;
  recommendations?: ReactNode;
  stickyBuyBar?: ReactNode;
  cartDrawer?: ReactNode;
  borderless?: boolean;
  onScroll?: (e: any) => void;
  isFocusMode?: boolean;
  onFocusModeChange?: (inFocus: boolean) => void;
  focusOverlay?: ReactNode;
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
  borderless,
  onScroll,
  isFocusMode: isFocusModeProp,
  onFocusModeChange,
  focusOverlay: focusOverlayProp,
}: ProductDetailTemplateProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const [internalFocusMode, setInternalFocusMode] = useState(false);
  const [internalFocusOverlay, setInternalFocusOverlay] = useState<ReactNode>(null);

  const isFocusMode = isFocusModeProp !== undefined ? isFocusModeProp : internalFocusMode;
  const focusOverlay = focusOverlayProp !== undefined ? focusOverlayProp : internalFocusOverlay;

  const handleSetFocusMode = useCallback(
    (inFocus: boolean) => {
      setInternalFocusMode(inFocus);
      onFocusModeChange?.(inFocus);
    },
    [onFocusModeChange]
  );

  return (
    <FocusModeContext.Provider
      value={{
        isFocusMode,
        setFocusMode: handleSetFocusMode,
        setFocusOverlay: setInternalFocusOverlay,
      }}
    >
      <YStack
        flex={1}
        backgroundColor={tokens.background}
        position="relative"
        overflow={isFocusMode ? 'hidden' : undefined}
      >
        {/* Sticky / Top Header - Hidden in Focus Mode */}
        {!isFocusMode && header}

        {/* Main PDP Scrollable Canvas - Hidden in Focus Mode to prevent scrolling */}
        <ScrollView
          style={{
            flex: 1,
            ...(isFocusMode ? { display: 'none' } : {}),
          }}
          scrollEnabled={!isFocusMode}
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
          paddingHorizontal={borderless && isMobile ? 8 : (isMobile ? 12 : isTablet ? 20 : 28)}
          paddingTop={isMobile ? (borderless ? 8 : 12) : 20}
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

        {/* Mobile Sticky Add to Bag Floating Bar - Hidden in Focus Mode */}
        {!isFocusMode && isMobile ? stickyBuyBar : null}

        {/* Slide-out Cart Drawer - Hidden in Focus Mode */}
        {!isFocusMode && cartDrawer}

        {/* Fullscreen Edge-to-Edge Focus Mode Overlay (Top to Bottom, 0 padding, no header/bottom bar) */}
        {isFocusMode && focusOverlay ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 999999,
              backgroundColor: '#000000',
              overflow: 'hidden',
            }}
          >
            {focusOverlay}
          </View>
        ) : null}
      </YStack>
    </FocusModeContext.Provider>
  );
}
