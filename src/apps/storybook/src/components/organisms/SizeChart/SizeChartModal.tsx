import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuRuler, LuSparkles, LuInfo, LuCheck, LuBookOpen } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { SizeChartModalProps, SizeChartTab, SizeChartFormFactor } from './types';
import { SegmentedControl } from '../../atoms/SegmentedControl/SegmentedControl';
import { SizeChartTable } from './SizeChartTable';
import { MeasuringSilhouette } from './MeasuringSilhouette';
import { resolveSizeChartForProduct } from '../../../data/catalog/sizePresets';

export function SizeChartModal({
  visible,
  onClose,
  data: dataProp,
  category,
  variant,
  noSizeVariant,
  selectedSize,
  onSelectSize,
  formFactor: formFactorProp,
  zIndex = 9999,
}: SizeChartModalProps) {
  const { tokens } = useTheme();
  const responsive = useResponsive();

  const activeFactor: SizeChartFormFactor =
    formFactorProp || (responsive.isMobile ? 'mobile' : responsive.isTablet ? 'tablet' : 'desktop');

  const chartData =
    dataProp || resolveSizeChartForProduct(category, variant, noSizeVariant);

  const [activeTab, setActiveTab] = useState<SizeChartTab>('table');

  if (!visible) return null;

  const isDesktop = activeFactor === 'desktop';
  const isTablet = activeFactor === 'tablet';
  const isMobile = activeFactor === 'mobile';

  // Modal Header
  const renderHeader = () => (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal={isMobile ? 16 : 24}
      paddingTop={isMobile ? 8 : 18}
      paddingBottom={12}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      <XStack alignItems="center" gap={10}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: `${tokens.accent}14`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LuRuler size={16} color={tokens.accent} />
        </View>
        <YStack>
          <Text fontSize={15} fontWeight="900" color={tokens.text}>
            {chartData.title}
          </Text>
          <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
            {chartData.subtitle || 'Standard Indian ethnic sizing & tailoring guidelines'}
          </Text>
        </YStack>
      </XStack>

      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: tokens.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel="Close Size Chart"
      >
        <LuX size={16} color={tokens.text} />
      </Pressable>
    </XStack>
  );

  // Tabs for Mobile & Tablet (reusing canonical SegmentedControl atom)
  const renderTabs = () => (
    <YStack marginHorizontal={isMobile ? 16 : 24} marginTop={12} marginBottom={6}>
      <SegmentedControl
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as SizeChartTab)}
        options={[
          { id: 'table', label: 'Size Chart' },
          { id: 'measuring', label: chartData.category === 'saree' ? 'Drape Guide' : 'How to Measure' },
        ]}
      />
    </YStack>
  );

  // Swipe down detection for dismissal
  const touchStartY = React.useRef<number | null>(null);
  const handleTouchStart = (e: any) => {
    touchStartY.current = e.nativeEvent?.touches?.[0]?.clientY ?? e.clientY;
  };
  const handleTouchEnd = (e: any) => {
    if (touchStartY.current === null) return;
    const endY = e.nativeEvent?.changedTouches?.[0]?.clientY ?? e.clientY;
    if (endY - touchStartY.current > 40) {
      // Swiped downward -> dismiss
      onClose();
    }
    touchStartY.current = null;
  };

  // ── BASE-ANCHORED BOTTOM SHEET MODAL (Sticks to bottom across all form factors) ──
  return (
    <View
      style={{
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: Math.max(zIndex || 1000, 1000),
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {/* Backdrop Pressable Dismissal */}
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        accessibilityLabel="Dismiss Size Chart Overlay"
      />

      <YStack
        width="100%"
        maxWidth={isDesktop ? 700 : isTablet ? 620 : '100%'}
        maxHeight="84vh"
        backgroundColor={tokens.surface}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        shadowColor="#000000"
        shadowOpacity={0.35}
        shadowRadius={28}
        shadowOffset={{ width: 0, height: -8 }}
        overflow="hidden"
        zIndex={1001}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle Bar */}
        <YStack alignItems="center" paddingTop={10} paddingBottom={2} cursor="grab">
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: tokens.border }} />
        </YStack>

        {renderHeader()}
        {renderTabs()}

        <ScrollView
          style={{ paddingHorizontal: isMobile ? 16 : 24, paddingVertical: 12, maxHeight: 460 }}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'table' ? (
            <SizeChartTable
              data={chartData}
              selectedSize={selectedSize}
              onSelectSize={(s) => {
                onSelectSize?.(s);
                onClose();
              }}
            />
          ) : (
            <MeasuringSilhouette data={chartData} />
          )}
        </ScrollView>

        {/* Bottom Safety Margin (No Got It button - dismissible via X in header, backdrop tap, or swipe down) */}
        <YStack height={16} backgroundColor={tokens.surface} />
      </YStack>
    </View>
  );
}
