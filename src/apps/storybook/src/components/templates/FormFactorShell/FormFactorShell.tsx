import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuRotateCcw,
  LuSparkles,
  LuLock,
  LuWifi,
  LuBattery,
  LuLayers,
  LuMaximize2,
} from 'react-icons/lu';
import { FormFactor, FormFactorContext, useTheme } from '../../../theme';
import { FormFactorShellProps, Orientation, FormFactorDimensions } from './types';

export * from './types';

export function FormFactorShell({
  children,
  initialFactor = 'desktop',
  title,
  category,
  allowOrientationToggle = true,
  allowBezelToggle = true,
  defaultBezel = true,
  forceStandalone = false,
  onFactorChange,
}: FormFactorShellProps) {
  // Context Guard: If already running inside an existing FormFactorShell / FormFactorContext,
  // do NOT double-wrap with an inner toolbar and inner chassis.
  const parentContext = React.useContext(FormFactorContext);
  if (parentContext && !forceStandalone) {
    return <>{children}</>;
  }

  const { tokens } = useTheme();

  const [factor, setFactor] = useState<FormFactor>(initialFactor);
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [showBezel, setShowBezel] = useState<boolean>(defaultBezel);

  const handleSelectFactor = (nextFactor: FormFactor) => {
    setFactor(nextFactor);
    onFactorChange?.(nextFactor);
  };

  const handleToggleOrientation = () => {
    setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'));
  };

  const handleToggleBezel = () => {
    setShowBezel((prev) => !prev);
  };

  // Dimensions computation based on factor & orientation
  const dimensions = useMemo<FormFactorDimensions>(() => {
    if (factor === 'mobile') {
      const isPortrait = orientation === 'portrait';
      return {
        width: isPortrait ? 390 : 844,
        height: isPortrait ? 844 : 390,
        label: isPortrait ? '390 × 844 px (iPhone 16)' : '844 × 390 px (Landscape)',
      };
    }
    if (factor === 'tablet') {
      const isPortrait = orientation === 'portrait';
      return {
        width: isPortrait ? 768 : 1024,
        height: isPortrait ? 1024 : 768,
        label: isPortrait ? '768 × 1024 px (iPad)' : '1024 × 768 px (Landscape)',
      };
    }
    return {
      width: '100%' as const,
      height: undefined,
      label: 'Fluid Desktop (100% / Max 1280px)',
    };
  }, [factor, orientation]);

  const isMobile = factor === 'mobile';
  const isTablet = factor === 'tablet';
  const isDesktop = factor === 'desktop';

  return (
    <YStack flex={1} minHeight={"100vh" as any} backgroundColor={tokens.background}>
      {/* ================================================================= */}
      {/* 1. TOP EXTERNAL SELECTOR TOOLBAR (Outside the device shell frame) */}
      {/* ================================================================= */}
      <YStack
        backgroundColor="#0F172A"
        borderBottomWidth={1}
        borderBottomColor="#1E293B"
        paddingHorizontal={16}
        paddingVertical={10}
        gap={8}
        style={styles.topBarShadow}
      >
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={10}>
          {/* Left: Shell Info & Category */}
          <XStack alignItems="center" gap={8}>
            <XStack
              width={26}
              height={26}
              borderRadius={6}
              backgroundColor="#1E293B"
              alignItems="center"
              justifyContent="center"
            >
              <LuSparkles size={14} color="#38BDF8" />
            </XStack>

            <YStack>
              <XStack alignItems="center" gap={6}>
                <Text fontSize={11} fontWeight="800" color="#38BDF8" letterSpacing={1} textTransform="uppercase">
                  FORM FACTOR SHELL
                </Text>
                <XStack width={6} height={6} borderRadius={3} backgroundColor="#10B981" />
              </XStack>
              {title && (
                <Text fontSize={12} fontWeight="700" color="#F8FAFC" numberOfLines={1}>
                  {category ? `${category} / ` : ''}{title}
                </Text>
              )}
            </YStack>
          </XStack>

          {/* Center: 3 Form Factor Switcher Buttons */}
          <XStack backgroundColor="#1E293B" borderRadius={10} padding={3} gap={4}>
            {/* Mobile (390px) */}
            <Pressable
              onPress={() => handleSelectFactor('mobile')}
              style={[
                styles.factorTab,
                isMobile && styles.factorTabActive,
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuSmartphone size={13} color={isMobile ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isMobile ? '800' : '600'} color={isMobile ? '#FFFFFF' : '#94A3B8'}>
                  Mobile (390px)
                </Text>
              </XStack>
            </Pressable>

            {/* Tablet (768px) */}
            <Pressable
              onPress={() => handleSelectFactor('tablet')}
              style={[
                styles.factorTab,
                isTablet && styles.factorTabActive,
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuTablet size={13} color={isTablet ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isTablet ? '800' : '600'} color={isTablet ? '#FFFFFF' : '#94A3B8'}>
                  Tablet (768px)
                </Text>
              </XStack>
            </Pressable>

            {/* Desktop (100%) */}
            <Pressable
              onPress={() => handleSelectFactor('desktop')}
              style={[
                styles.factorTab,
                isDesktop && styles.factorTabActive,
              ]}
            >
              <XStack alignItems="center" gap={5}>
                <LuMonitor size={13} color={isDesktop ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isDesktop ? '800' : '600'} color={isDesktop ? '#FFFFFF' : '#94A3B8'}>
                  Desktop (Fluid)
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          {/* Right: Dimension Pill, Orientation, and Bezel Toggle */}
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            {/* Dimension Badge */}
            <XStack
              backgroundColor="#1E293B"
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={6}
              alignItems="center"
              gap={5}
            >
              <LuMaximize2 size={11} color="#94A3B8" />
              <Text fontSize={10.5} fontWeight="700" color="#E2E8F0">
                {dimensions.label}
              </Text>
            </XStack>

            {/* Orientation Toggle (for Mobile / Tablet) */}
            {allowOrientationToggle && !isDesktop && (
              <Pressable
                onPress={handleToggleOrientation}
                style={[
                  styles.utilityButton,
                  orientation === 'landscape' && styles.utilityButtonActive,
                ]}
              >
                <XStack alignItems="center" gap={4}>
                  <LuRotateCcw size={11} color={orientation === 'landscape' ? '#FFF' : '#94A3B8'} />
                  <Text
                    fontSize={10}
                    fontWeight="700"
                    color={orientation === 'landscape' ? '#FFF' : '#94A3B8'}
                  >
                    {orientation.toUpperCase()}
                  </Text>
                </XStack>
              </Pressable>
            )}

            {/* Bezel Toggle (for Mobile / Tablet) */}
            {allowBezelToggle && !isDesktop && (
              <Pressable
                onPress={handleToggleBezel}
                style={[
                  styles.utilityButton,
                  showBezel && styles.utilityButtonActive,
                ]}
              >
                <XStack alignItems="center" gap={4}>
                  <LuLayers size={11} color={showBezel ? '#FFF' : '#94A3B8'} />
                  <Text fontSize={10} fontWeight="700" color={showBezel ? '#FFF' : '#94A3B8'}>
                    BEZEL: {showBezel ? 'ON' : 'OFF'}
                  </Text>
                </XStack>
              </Pressable>
            )}
          </XStack>
        </XStack>
      </YStack>

      {/* ================================================================= */}
      {/* 2. MAIN SHELL CANVAS: RENDERS THE DEVICE SHELL FRAME              */}
      {/* ================================================================= */}
      <YStack
        flex={1}
        paddingVertical={isDesktop ? 16 : 24}
        paddingHorizontal={isDesktop ? 16 : 12}
        alignItems="center"
        justifyContent="flex-start"
        width="100%"
        style={styles.canvasBackground}
      >
        <FormFactorContext.Provider
          value={{
            factor,
            isMobile,
            isTablet,
            isDesktop,
            containerWidth: (dimensions.width as number | string) || '100%',
          }}
        >
          {/* --- CASE A: MOBILE DEVICE SHELL --- */}
          {isMobile && (
            <View
              style={[
                styles.mobileChassis,
                {
                  width: dimensions.width,
                  height: dimensions.height,
                  borderRadius: showBezel ? 36 : 14,
                  borderWidth: showBezel ? 4 : 1,
                  borderColor: showBezel ? '#1E293B' : tokens.border,
                  backgroundColor: tokens.surface,
                },
                showBezel && styles.bezelShadow,
              ]}
            >
              {/* Phone Bezel Header with Dynamic Island & Status Bar */}
              {showBezel && (
                <YStack backgroundColor="#0F172A" paddingHorizontal={14} paddingVertical={8} gap={4}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={11} fontWeight="800" color="#F8FAFC">
                      9:41
                    </Text>

                    {/* Dynamic Island Pill */}
                    <XStack
                      width={74}
                      height={14}
                      borderRadius={7}
                      backgroundColor="#020617"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <XStack width={6} height={6} borderRadius={3} backgroundColor="#1E293B" />
                    </XStack>

                    <XStack alignItems="center" gap={5}>
                      <LuWifi size={11} color="#F8FAFC" />
                      <LuBattery size={13} color="#F8FAFC" />
                    </XStack>
                  </XStack>
                </YStack>
              )}

              {/* Child Story Content */}
              <View style={styles.shellContentContainer}>
                {children}
              </View>

              {/* Bottom Home Indicator Pill */}
              {showBezel && (
                <YStack alignItems="center" paddingVertical={6} backgroundColor={tokens.surface}>
                  <XStack width={120} height={4} borderRadius={2} backgroundColor="#94A3B8" />
                </YStack>
              )}
            </View>
          )}

          {/* --- CASE B: TABLET DEVICE SHELL --- */}
          {isTablet && (
            <View
              style={[
                styles.tabletChassis,
                {
                  width: dimensions.width,
                  height: dimensions.height,
                  borderRadius: showBezel ? 24 : 14,
                  borderWidth: showBezel ? 3 : 1,
                  borderColor: showBezel ? '#334155' : tokens.border,
                  backgroundColor: tokens.surface,
                },
                showBezel && styles.bezelShadow,
              ]}
            >
              {/* Tablet Bezel Header */}
              {showBezel && (
                <YStack backgroundColor="#0F172A" paddingHorizontal={16} paddingVertical={8}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={11} fontWeight="700" color="#94A3B8">
                      Wednesday, 9:41 AM
                    </Text>
                    <XStack width={6} height={6} borderRadius={3} backgroundColor="#334155" />
                    <XStack alignItems="center" gap={6}>
                      <LuWifi size={11} color="#94A3B8" />
                      <LuBattery size={13} color="#94A3B8" />
                    </XStack>
                  </XStack>
                </YStack>
              )}

              {/* Child Story Content */}
              <View style={styles.shellContentContainer}>
                {children}
              </View>
            </View>
          )}

          {/* --- CASE C: DESKTOP MACOS WINDOW SHELL --- */}
          {isDesktop && (
            <View
              style={[
                styles.desktopWindow,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.surface,
                },
                styles.windowShadow,
              ]}
            >
              {/* macOS Window Header Bar */}
              <XStack
                backgroundColor="#0F172A"
                paddingHorizontal={14}
                paddingVertical={8}
                justifyContent="space-between"
                alignItems="center"
                borderBottomWidth={1}
                borderBottomColor="#1E293B"
              >
                {/* macOS Window Controls (Traffic Lights) */}
                <XStack alignItems="center" gap={6}>
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#FF5F56" />
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#FFBD2E" />
                  <XStack width={10} height={10} borderRadius={5} backgroundColor="#27C93F" />
                </XStack>

                {/* Simulated URL Pill */}
                <XStack
                  backgroundColor="#1E293B"
                  paddingHorizontal={12}
                  paddingVertical={3}
                  borderRadius={6}
                  alignItems="center"
                  gap={6}
                >
                  <LuLock size={10} color="#10B981" />
                  <Text fontSize={10.5} fontWeight="600" color="#E2E8F0">
                    store.vayyari.com/storybook
                  </Text>
                </XStack>

                {/* Status Dot */}
                <XStack alignItems="center" gap={4}>
                  <XStack width={6} height={6} borderRadius={3} backgroundColor="#10B981" />
                  <Text fontSize={9.5} fontWeight="700" color="#94A3B8">
                    100% FLUID
                  </Text>
                </XStack>
              </XStack>

              {/* Child Story Content */}
              <View style={styles.shellContentContainer}>
                {children}
              </View>
            </View>
          )}
        </FormFactorContext.Provider>
      </YStack>
    </YStack>
  );
}

export function withFormFactorShell(initialFactor: FormFactor = 'desktop', title?: string) {
  return (Story: any, context: any) => {
    const existingContext = React.useContext(FormFactorContext);
    if (existingContext) {
      return <Story {...context} />;
    }
    return (
      <FormFactorShell
        initialFactor={initialFactor}
        title={title || context?.name || context?.story}
        category={context?.title?.split('/')[0]}
      >
        <Story {...context} />
      </FormFactorShell>
    );
  };
}

const styles = StyleSheet.create({
  topBarShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  factorTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  factorTabActive: {
    backgroundColor: '#0F766E',
  },
  utilityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  utilityButtonActive: {
    backgroundColor: '#334155',
  },
  canvasBackground: {
    flex: 1,
    width: '100%',
    minHeight: 'calc(100vh - 65px)' as any,
    overflow: 'visible' as any,
    display: 'flex' as any,
    flexDirection: 'column' as any,
  },
  mobileChassis: {
    overflow: 'hidden',
    alignSelf: 'center',
    display: 'flex' as any,
    flexDirection: 'column' as any,
    maxHeight: '90vh' as any,
  },
  tabletChassis: {
    overflow: 'hidden',
    alignSelf: 'center',
    display: 'flex' as any,
    flexDirection: 'column' as any,
    maxHeight: '90vh' as any,
  },
  desktopWindow: {
    flex: 1,
    width: '100%',
    maxWidth: 1280,
    minHeight: 'calc(100vh - 100px)' as any,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    display: 'flex' as any,
    flexDirection: 'column' as any,
  },
  bezelShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  windowShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  shellContentContainer: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    display: 'flex' as any,
    flexDirection: 'column' as any,
    overflow: 'auto' as any,
  },
});
