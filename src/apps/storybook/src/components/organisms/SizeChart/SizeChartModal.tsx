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

  // ── DESKTOP SPLIT VIEW (Side-by-side Dual Column) ──
  if (isDesktop) {
    return (
      <View
        style={{
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <YStack
          width="100%"
          maxWidth={960}
          maxHeight="85vh"
          backgroundColor={tokens.surface}
          borderRadius={20}
          borderWidth={1}
          borderColor={tokens.border}
          shadowColor="#000000"
          shadowOpacity={0.35}
          shadowRadius={32}
          shadowOffset={{ width: 0, height: 16 }}
          overflow="hidden"
        >
          {renderHeader()}

          <XStack flex={1} overflow="hidden">
            {/* Left Column (58%): Interactive Table */}
            <YStack
              flex={1.4}
              padding={24}
              borderRightWidth={1}
              borderRightColor={tokens.border}
              overflowY="auto"
            >
              <SizeChartTable
                data={chartData}
                selectedSize={selectedSize}
                onSelectSize={(s) => {
                  onSelectSize?.(s);
                  onClose();
                }}
              />
            </YStack>

            {/* Right Column (42%): Illustrated Measuring Guide */}
            <YStack flex={1} padding={24} backgroundColor={tokens.surfaceRaised} overflowY="auto">
              <MeasuringSilhouette data={chartData} />
            </YStack>
          </XStack>

          {/* Desktop Footer */}
          <XStack
            paddingHorizontal={24}
            paddingVertical={14}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            backgroundColor={tokens.surface}
            justifyContent="space-between"
            alignItems="center"
          >
            <XStack alignItems="center" gap={6}>
              <LuCheck size={14} color="#15803D" />
              <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                All DeepLens ethnic garments undergo rigorous 7-point QA measurement checks
              </Text>
            </XStack>
            <Pressable
              onPress={onClose}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: tokens.accent,
              }}
            >
              <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                Done
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </View>
    );
  }

  // ── TABLET FLOATING MODAL DIALOG ──
  if (isTablet) {
    return (
      <View
        style={{
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          zIndex,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <YStack
          width="100%"
          maxWidth={660}
          maxHeight="85vh"
          backgroundColor={tokens.surface}
          borderRadius={20}
          borderWidth={1}
          borderColor={tokens.border}
          shadowColor="#000000"
          shadowOpacity={0.3}
          shadowRadius={28}
          shadowOffset={{ width: 0, height: 12 }}
          overflow="hidden"
        >
          {renderHeader()}
          {renderTabs()}

          <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 14, maxHeight: 480 }}>
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

          {/* Tablet Footer */}
          <XStack
            paddingHorizontal={24}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            justifyContent="flex-end"
          >
            <Pressable
              onPress={onClose}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: tokens.accent,
              }}
            >
              <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                Close
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </View>
    );
  }

  // ── MOBILE BOTTOM SHEET MODAL ──
  return (
    <View
      style={{
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex,
        justifyContent: 'flex-end',
      }}
    >
      <YStack
        width="100%"
        maxHeight="90vh"
        backgroundColor={tokens.surface}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        shadowColor="#000000"
        shadowOpacity={0.3}
        shadowRadius={24}
        shadowOffset={{ width: 0, height: -8 }}
        overflow="hidden"
      >
        {/* Drag Handle */}
        <YStack alignItems="center" paddingTop={10}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: tokens.border }} />
        </YStack>

        {renderHeader()}
        {renderTabs()}

        <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 12, maxHeight: 420 }}>
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

        {/* Mobile Bottom Bar */}
        <XStack
          paddingHorizontal={16}
          paddingVertical={12}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          backgroundColor={tokens.surface}
        >
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: tokens.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
              Got It
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    </View>
  );
}
