import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSlidersHorizontal,
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuEye,
  LuStar,
  LuFileText,
  LuCheck,
  LuRotateCcw,
  LuPalette,
  LuChevronRight,
  LuChevronDown,
  LuLayers,
  LuSparkles,
  LuX,
  LuMenu,
  LuMaximize2,
} from 'react-icons/lu';
import {
  ProductDetailPage,
  PdpConfig,
  PdpSectionId,
  PDP_PRESETS,
  MOBILE_FLUSH_PRESET,
  DEFAULT_PDP_CONFIG,
} from './ProductDetailPage';
import {
  CatalogTestProduct,
  DIVERSE_CATALOG_PRODUCTS,
  getProductBySku,
} from '../../data/catalog';
import { useTheme, FormFactorContext, FormFactorContextValue } from '../../theme';

export interface StoreConfigurationStudioPageProps {
  initialSku?: string;
  initialPreset?: 'control' | 'treatment' | 'mobile_flush';
  initialDevice?: 'mobile' | 'tablet' | 'desktop';
  initialDrawerOpen?: boolean;
}

export function StoreConfigurationStudioPage({
  initialSku = 'VF2B56',
  initialPreset = 'treatment',
  initialDevice = 'mobile',
  initialDrawerOpen = true,
}: StoreConfigurationStudioPageProps) {
  const { tokens } = useTheme();

  // Selected Product State
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const activeProduct = useMemo(
    () => getProductBySku(selectedSku) || DIVERSE_CATALOG_PRODUCTS[0],
    [selectedSku]
  );

  // Active Device State
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(initialDevice);

  // Drawer Toggle State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(initialDrawerOpen);

  // Active Config State initialized from preset
  const [config, setConfig] = useState<PdpConfig>(() => {
    if (initialPreset === 'mobile_flush') return { ...MOBILE_FLUSH_PRESET };
    return { ...PDP_PRESETS[initialPreset] };
  });

  // Helper to determine if current config exactly matches a preset
  const activePresetType = useMemo((): 'control' | 'treatment' | 'mobile_flush' | 'custom' => {
    if (config.containerStyle === 'borderless') return 'mobile_flush';

    const isControl =
      config.showRatings === PDP_PRESETS.control.showRatings &&
      config.showViewsCount === PDP_PRESETS.control.showViewsCount &&
      config.descriptionDefaultCollapsed === PDP_PRESETS.control.descriptionDefaultCollapsed &&
      config.specsDefaultCollapsed === PDP_PRESETS.control.specsDefaultCollapsed &&
      config.presentationMode === PDP_PRESETS.control.presentationMode &&
      JSON.stringify(config.visibleSections) === JSON.stringify(PDP_PRESETS.control.visibleSections);

    if (isControl) return 'control';

    const isTreatment =
      config.showRatings === PDP_PRESETS.treatment.showRatings &&
      config.showViewsCount === PDP_PRESETS.treatment.showViewsCount &&
      config.descriptionDefaultCollapsed === PDP_PRESETS.treatment.descriptionDefaultCollapsed &&
      config.specsDefaultCollapsed === PDP_PRESETS.treatment.specsDefaultCollapsed &&
      config.presentationMode === PDP_PRESETS.treatment.presentationMode &&
      JSON.stringify(config.visibleSections) === JSON.stringify(PDP_PRESETS.treatment.visibleSections);

    if (isTreatment) return 'treatment';
    return 'custom';
  }, [config]);

  // Apply a Preset
  const handleApplyPreset = (presetKey: 'control' | 'treatment' | 'mobile_flush') => {
    if (presetKey === 'mobile_flush') {
      setConfig({ ...MOBILE_FLUSH_PRESET });
    } else {
      setConfig({
        ...PDP_PRESETS[presetKey],
      });
    }
  };

  // Toggle Section in visibleSections
  const handleToggleSection = (sectionId: PdpSectionId) => {
    setConfig((prev) => {
      const current = prev.visibleSections || [];
      const exists = current.includes(sectionId);
      const updated = exists
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId];
      return { ...prev, visibleSections: updated };
    });
  };

  // Device context mocking
  const responsiveContextValue: FormFactorContextValue = useMemo(() => {
    return {
      factor: device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      containerWidth: device === 'mobile' ? 390 : device === 'tablet' ? 768 : 1240,
    };
  }, [device]);

  return (
    <YStack flex={1} height="100vh" backgroundColor="#0B0F17" overflow="hidden">
      {/* ── Studio Top Header Bar ── */}
      <XStack
        height={64}
        backgroundColor="#111827"
        borderBottomColor="#1F2937"
        borderBottomWidth={1}
        paddingHorizontal={20}
        alignItems="center"
        justifyContent="space-between"
        zIndex={50}
      >
        {/* Left: Studio Branding & Title */}
        <XStack alignItems="center" gap={12}>
          <Pressable
            onPress={() => setDrawerOpen(!drawerOpen)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: drawerOpen ? '#374151' : '#1F2937',
              cursor: 'pointer',
            } as any}
          >
            {drawerOpen ? <LuX size={18} color="#F3F4F6" /> : <LuMenu size={18} color="#F3F4F6" />}
          </Pressable>

          <XStack
            width={34}
            height={34}
            borderRadius={8}
            backgroundColor="#8B5CF6"
            alignItems="center"
            justifyContent="center"
          >
            <LuSlidersHorizontal size={18} color="#FFFFFF" />
          </XStack>

          <YStack>
            <XStack alignItems="center" gap={8}>
              <Text fontSize={15} fontWeight="900" color="#F9FAFB" letterSpacing={-0.3}>
                Store Configuration Studio
              </Text>
              <XStack
                backgroundColor="#065F46"
                paddingHorizontal={6}
                paddingVertical={2}
                borderRadius={4}
                alignItems="center"
                gap={4}
              >
                <Text fontSize={10} fontWeight="800" color="#34D399" textTransform="uppercase">
                  Live A/B Sandbox
                </Text>
              </XStack>
            </XStack>
            <Text fontSize={11} color="#9CA3AF">
              PDP Merchandising &amp; Behavioral Experiments
            </Text>
          </YStack>
        </XStack>

        {/* Center: Catalog Product Selector */}
        <XStack
          backgroundColor="#1F2937"
          borderRadius={10}
          padding={3}
          alignItems="center"
          gap={4}
        >
          {[
            { sku: 'VF2B56', label: 'VF2B56 (Saree)' },
            { sku: 'VF2F4A', label: 'VF2F4A (Anarkali)' },
            { sku: 'VF2F4F', label: 'VF2F4F (Lehenga)' },
          ].map((item) => {
            const isSelected = selectedSku === item.sku;
            return (
              <Pressable
                key={item.sku}
                onPress={() => setSelectedSku(item.sku)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 7,
                  backgroundColor: isSelected ? '#8B5CF6' : 'transparent',
                  cursor: 'pointer',
                } as any}
              >
                <Text
                  fontSize={12}
                  fontWeight={isSelected ? '800' : '600'}
                  color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>

        {/* Right: Device Hardware Frame Switcher & Preset Pill */}
        <XStack alignItems="center" gap={12}>
          {/* Preset Pill */}
          <XStack
            backgroundColor="#1F2937"
            borderRadius={8}
            paddingHorizontal={10}
            paddingVertical={5}
            alignItems="center"
            gap={6}
          >
            <Text fontSize={11} color="#9CA3AF" fontWeight="600">
              Active:
            </Text>
            <Text
              fontSize={11}
              fontWeight="900"
              color={
                activePresetType === 'treatment'
                  ? '#34D399'
                  : activePresetType === 'control'
                  ? '#60A5FA'
                  : activePresetType === 'mobile_flush'
                  ? '#F472B6'
                  : '#F59E0B'
              }
            >
              {activePresetType === 'treatment'
                ? 'Variant B (Treatment)'
                : activePresetType === 'control'
                ? 'Variant A (Control)'
                : activePresetType === 'mobile_flush'
                ? 'Variant C (Mobile Flush)'
                : 'Custom Overrides'}
            </Text>
          </XStack>

          {/* Device Frame Buttons */}
          <XStack
            backgroundColor="#1F2937"
            borderRadius={10}
            padding={3}
            alignItems="center"
            gap={2}
          >
            <Pressable
              onPress={() => setDevice('mobile')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: device === 'mobile' ? '#374151' : 'transparent',
                cursor: 'pointer',
              } as any}
            >
              <LuSmartphone size={14} color={device === 'mobile' ? '#F3F4F6' : '#9CA3AF'} />
              <Text fontSize={11} fontWeight="700" color={device === 'mobile' ? '#FFFFFF' : '#9CA3AF'}>
                390px
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDevice('tablet')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: device === 'tablet' ? '#374151' : 'transparent',
                cursor: 'pointer',
              } as any}
            >
              <LuTablet size={14} color={device === 'tablet' ? '#F3F4F6' : '#9CA3AF'} />
              <Text fontSize={11} fontWeight="700" color={device === 'tablet' ? '#FFFFFF' : '#9CA3AF'}>
                768px
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDevice('desktop')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: device === 'desktop' ? '#374151' : 'transparent',
                cursor: 'pointer',
              } as any}
            >
              <LuMonitor size={14} color={device === 'desktop' ? '#F3F4F6' : '#9CA3AF'} />
              <Text fontSize={11} fontWeight="700" color={device === 'desktop' ? '#FFFFFF' : '#9CA3AF'}>
                1240px
              </Text>
            </Pressable>
          </XStack>
        </XStack>
      </XStack>

      {/* ── Studio Body (Drawer + Device Canvas) ── */}
      <XStack flex={1} overflow="hidden">
        {/* ── Left Configuration Drawer ── */}
        {drawerOpen && (
          <YStack
            width={340}
            backgroundColor="#111827"
            borderRightColor="#1F2937"
            borderRightWidth={1}
            overflow="hidden"
            zIndex={40}
          >
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
              {/* Card 1: A/B Experimentation Presets */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={10}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={6}>
                    <Text fontSize={14}>🧪</Text>
                    <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                      A/B Experimentation Presets
                    </Text>
                  </XStack>
                  <Text fontSize={10} color="#9CA3AF">
                    Fast Switch
                  </Text>
                </XStack>

                <YStack gap={8}>
                  {/* Variant A: Control */}
                  <Pressable
                    onPress={() => handleApplyPreset('control')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: activePresetType === 'control' ? 2 : 1,
                      borderColor: activePresetType === 'control' ? '#3B82F6' : '#374151',
                      backgroundColor: activePresetType === 'control' ? '#1E3A8A' : '#111827',
                      cursor: 'pointer',
                    } as any}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                        Variant A (Control)
                      </Text>
                      {activePresetType === 'control' && (
                        <Text fontSize={10} color="#93C5FD" fontWeight="800">
                          ACTIVE
                        </Text>
                      )}
                    </XStack>
                    <Text fontSize={10} color="#93C5FD" marginTop={2}>
                      Classic Heritage (Card Containers, Expanded Specs)
                    </Text>
                  </Pressable>

                  {/* Variant B: Treatment */}
                  <Pressable
                    onPress={() => handleApplyPreset('treatment')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: activePresetType === 'treatment' ? 2 : 1,
                      borderColor: activePresetType === 'treatment' ? '#10B981' : '#374151',
                      backgroundColor: activePresetType === 'treatment' ? '#064E3B' : '#111827',
                      cursor: 'pointer',
                    } as any}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                        Variant B (Treatment)
                      </Text>
                      {activePresetType === 'treatment' && (
                        <Text fontSize={10} color="#6EE7B7" fontWeight="800">
                          ACTIVE
                        </Text>
                      )}
                    </XStack>
                    <Text fontSize={10} color="#6EE7B7" marginTop={2}>
                      High Social Proof (Boxed Cards, Compact Clamped Info)
                    </Text>
                  </Pressable>

                  {/* Variant C: Mobile Flush */}
                  <Pressable
                    onPress={() => handleApplyPreset('mobile_flush')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: activePresetType === 'mobile_flush' ? 2 : 1,
                      borderColor: activePresetType === 'mobile_flush' ? '#EC4899' : '#374151',
                      backgroundColor: activePresetType === 'mobile_flush' ? '#831843' : '#111827',
                      cursor: 'pointer',
                    } as any}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                        Variant C (Mobile Flush)
                      </Text>
                      {activePresetType === 'mobile_flush' && (
                        <Text fontSize={10} color="#F472B6" fontWeight="800">
                          ACTIVE
                        </Text>
                      )}
                    </XStack>
                    <Text fontSize={10} color="#F472B6" marginTop={2}>
                      Borderless Edge-to-Edge (Zero Box Margins on Mobile)
                    </Text>
                  </Pressable>
                </YStack>

                <Text fontSize={10} color="#9CA3AF" lineHeight={14}>
                  {activePresetType === 'mobile_flush'
                    ? '📱 Variant C (Mobile Flush): removes boxed section containers and side padding on mobile, giving edge-to-edge content with 56px margin savings while preserving full social proof & discovery rails.'
                    : activePresetType === 'treatment'
                    ? '✨ Treatment includes: live views count chip, 2-line clamped description with read more, collapsed specs with (12) count, floating gallery thumbnails, and full discovery rails in boxed cards.'
                    : activePresetType === 'control'
                    ? '🏛️ Control includes: classic un-clamped description, expanded specifications table, no views badge, and classic rails.'
                    : '⚙️ Custom overrides configured below.'}
                </Text>
              </YStack>

              {/* Card 2: Social Proof & Badges */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={12}
              >
                <XStack alignItems="center" gap={6}>
                  <LuEye size={15} color="#F59E0B" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    Social Proof &amp; Badges
                  </Text>
                </XStack>

                {/* Rating Badge Switch */}
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack>
                    <Text fontSize={12} fontWeight="700" color="#E5E7EB">
                      Show Ratings Badge
                    </Text>
                    <Text fontSize={10} color="#9CA3AF">
                      Display 4.8 ★ (248 reviews)
                    </Text>
                  </YStack>
                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, showRatings: !p.showRatings }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: config.showRatings ? '#8B5CF6' : '#374151',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: config.showRatings ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                  </Pressable>
                </XStack>

                {/* Live Views Count Switch */}
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack>
                    <Text fontSize={12} fontWeight="700" color="#E5E7EB">
                      Live Views Count Chip
                    </Text>
                    <Text fontSize={10} color="#9CA3AF">
                      Amber urgency chip with eye icon
                    </Text>
                  </YStack>
                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, showViewsCount: !p.showViewsCount }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: config.showViewsCount ? '#8B5CF6' : '#374151',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: config.showViewsCount ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                  </Pressable>
                </XStack>

                {/* Live Views Stepper */}
                {config.showViewsCount && (
                  <XStack alignItems="center" justifyContent="space-between" marginTop={2}>
                    <Text fontSize={11} color="#D1D5DB">
                      Active Viewers:
                    </Text>
                    <XStack gap={6}>
                      {['840', '1.2k', '1.4k', '2.8k'].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => setConfig((p) => ({ ...p, viewsCount: val }))}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: config.viewsCount === val ? '#F59E0B' : '#111827',
                            cursor: 'pointer',
                          } as any}
                        >
                          <Text
                            fontSize={10}
                            fontWeight="800"
                            color={config.viewsCount === val ? '#111827' : '#9CA3AF'}
                          >
                            {val}
                          </Text>
                        </Pressable>
                      ))}
                    </XStack>
                  </XStack>
                )}
              </YStack>

              {/* Card 3: Story & Description Collapsing */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={12}
              >
                <XStack alignItems="center" gap={6}>
                  <LuFileText size={15} color="#60A5FA" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    Story &amp; Description
                  </Text>
                </XStack>

                <XStack alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight={10}>
                    <Text fontSize={12} fontWeight="700" color="#E5E7EB">
                      Default Collapsed
                    </Text>
                    <Text fontSize={10} color="#9CA3AF">
                      Clamp to 2 lines with Read More toggle
                    </Text>
                  </YStack>
                  <Pressable
                    onPress={() =>
                      setConfig((p) => ({
                        ...p,
                        descriptionDefaultCollapsed: !p.descriptionDefaultCollapsed,
                      }))
                    }
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: config.descriptionDefaultCollapsed ? '#8B5CF6' : '#374151',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: config.descriptionDefaultCollapsed ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                  </Pressable>
                </XStack>
              </YStack>

              {/* Card 4: Specifications & Craft Details */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={12}
              >
                <XStack alignItems="center" gap={6}>
                  <LuLayers size={15} color="#34D399" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    Specifications &amp; Sizing
                  </Text>
                </XStack>

                {/* Specs Default Collapsed */}
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight={10}>
                    <Text fontSize={12} fontWeight="700" color="#E5E7EB">
                      Default Collapsed
                    </Text>
                    <Text fontSize={10} color="#9CA3AF">
                      Shows attribute count in brackets (12)
                    </Text>
                  </YStack>
                  <Pressable
                    onPress={() =>
                      setConfig((p) => ({
                        ...p,
                        specsDefaultCollapsed: !p.specsDefaultCollapsed,
                      }))
                    }
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: config.specsDefaultCollapsed ? '#8B5CF6' : '#374151',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: config.specsDefaultCollapsed ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                  </Pressable>
                </XStack>

                {/* Silk Mark Badge */}
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack>
                    <Text fontSize={12} fontWeight="700" color="#E5E7EB">
                      Silk Mark Guarantee Badge
                    </Text>
                    <Text fontSize={10} color="#9CA3AF">
                      Authenticity certification pill
                    </Text>
                  </YStack>
                  <Pressable
                    onPress={() =>
                      setConfig((p) => ({
                        ...p,
                        specsShowSilkMark: !p.specsShowSilkMark,
                      }))
                    }
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: config.specsShowSilkMark ? '#8B5CF6' : '#374151',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: config.specsShowSilkMark ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                    } as any}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                  </Pressable>
                </XStack>
              </YStack>

              {/* Card 5: Presentation Mode */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={10}
              >
                <XStack alignItems="center" gap={6}>
                  <LuPalette size={15} color="#EC4899" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    PDP Presentation Mode
                  </Text>
                </XStack>

                <XStack gap={8}>
                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, presentationMode: 'grouped' }))}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: config.presentationMode === 'grouped' ? '#8B5CF6' : '#111827',
                      alignItems: 'center',
                      cursor: 'pointer',
                    } as any}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={config.presentationMode === 'grouped' ? '#FFFFFF' : '#9CA3AF'}
                    >
                      Grouped (Multi-Swatch)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, presentationMode: 'split' }))}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: config.presentationMode === 'split' ? '#8B5CF6' : '#111827',
                      alignItems: 'center',
                      cursor: 'pointer',
                    } as any}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={config.presentationMode === 'split' ? '#FFFFFF' : '#9CA3AF'}
                    >
                      Split (Single-SKU)
                    </Text>
                  </Pressable>
                </XStack>
              </YStack>

              {/* Card 6: Mobile Section Containers (Borderless vs Boxed Cards) */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={10}
              >
                <XStack alignItems="center" gap={6}>
                  <LuMaximize2 size={15} color="#38BDF8" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    Mobile Section Containers
                  </Text>
                </XStack>
                <Text fontSize={10} color="#9CA3AF" lineHeight={14}>
                  Removes card padding &amp; background containers on mobile viewports so content stretches edge-to-edge without wasting horizontal margins.
                </Text>

                <XStack gap={8}>
                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, containerStyle: 'cards' }))}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor:
                        (config.containerStyle || 'cards') === 'cards' ? '#3B82F6' : '#111827',
                      borderWidth: 1,
                      borderColor:
                        (config.containerStyle || 'cards') === 'cards' ? '#60A5FA' : '#374151',
                      alignItems: 'center',
                      cursor: 'pointer',
                    } as any}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={(config.containerStyle || 'cards') === 'cards' ? '#FFFFFF' : '#9CA3AF'}
                    >
                      Boxed Cards
                    </Text>
                    <Text
                      fontSize={9}
                      color={(config.containerStyle || 'cards') === 'cards' ? '#DBEAFE' : '#6B7280'}
                      marginTop={2}
                    >
                      With 16px Gutters
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setConfig((p) => ({ ...p, containerStyle: 'borderless' }))}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor:
                        config.containerStyle === 'borderless' ? '#EC4899' : '#111827',
                      borderWidth: 1,
                      borderColor:
                        config.containerStyle === 'borderless' ? '#F472B6' : '#374151',
                      alignItems: 'center',
                      cursor: 'pointer',
                    } as any}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={config.containerStyle === 'borderless' ? '#FFFFFF' : '#9CA3AF'}
                    >
                      Borderless Flush
                    </Text>
                    <Text
                      fontSize={9}
                      color={config.containerStyle === 'borderless' ? '#FCE7F3' : '#6B7280'}
                      marginTop={2}
                    >
                      Edge-to-Edge Margin
                    </Text>
                  </Pressable>
                </XStack>
              </YStack>

              {/* Card 7: Discovery Rails Order & Visibility */}
              <YStack
                backgroundColor="#1F2937"
                borderColor="#374151"
                borderWidth={1}
                borderRadius={12}
                padding={14}
                gap={10}
              >
                <XStack alignItems="center" gap={6}>
                  <LuSparkles size={15} color="#A78BFA" />
                  <Text fontSize={12} fontWeight="900" color="#F3F4F6" textTransform="uppercase">
                    Discovery Rails &amp; Modules
                  </Text>
                </XStack>

                {[
                  { id: 'color_variations', label: 'Color Variations (Sibling SKUs)', icon: '🎨' },
                  { id: 'frequently_bought', label: 'Frequently Bought Together', icon: '🛍' },
                  { id: 'specifications', label: 'Specifications & Craft Details', icon: '📜' },
                  { id: 'reviews', label: 'Customer Reviews & Ratings', icon: '⭐' },
                  { id: 'similar_products', label: 'Similar Products (You May Cherish)', icon: '💎' },
                  { id: 'you_may_like', label: 'You May Like (Curated Masterpieces)', icon: '✨' },
                  { id: 'recently_viewed', label: 'Recently Viewed (Your Journey)', icon: '🕒' },
                ].map((sec) => {
                  const isVisible = config.visibleSections?.includes(sec.id as PdpSectionId);
                  return (
                    <Pressable
                      key={sec.id}
                      onPress={() => handleToggleSection(sec.id as PdpSectionId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                        cursor: 'pointer',
                      } as any}
                    >
                      <XStack alignItems="center" gap={8} flex={1}>
                        <Text fontSize={12}>{sec.icon}</Text>
                        <Text
                          fontSize={11}
                          fontWeight={isVisible ? '700' : '500'}
                          color={isVisible ? '#E5E7EB' : '#6B7280'}
                          numberOfLines={1}
                        >
                          {sec.label}
                        </Text>
                      </XStack>
                      <XStack
                        width={20}
                        height={20}
                        borderRadius={6}
                        borderWidth={1.5}
                        borderColor={isVisible ? '#8B5CF6' : '#4B5563'}
                        backgroundColor={isVisible ? '#8B5CF6' : 'transparent'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isVisible && <LuCheck size={13} color="#FFFFFF" />}
                      </XStack>
                    </Pressable>
                  );
                })}
              </YStack>

              {/* Reset Button */}
              <Pressable
                onPress={() => handleApplyPreset('treatment')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#1F2937',
                  borderWidth: 1,
                  borderColor: '#374151',
                  marginTop: 6,
                  cursor: 'pointer',
                } as any}
              >
                <LuRotateCcw size={14} color="#9CA3AF" />
                <Text fontSize={12} fontWeight="800" color="#E5E7EB">
                  Reset to Treatment Preset
                </Text>
              </Pressable>
            </ScrollView>
          </YStack>
        )}

        {/* ── Main Canvas (Multi-Device Frame) ── */}
        <YStack
          flex={1}
          backgroundColor="#0B0F17"
          alignItems="center"
          justifyContent="center"
          padding={device === 'mobile' ? 24 : 16}
          overflow="hidden"
        >
          <View
            style={[
              styles.hardwareChassis,
              {
                width: device === 'mobile' ? 390 : device === 'tablet' ? 768 : '100%',
                maxWidth: device === 'desktop' ? 1240 : undefined,
                height: '100%',
                maxHeight: device === 'mobile' ? 844 : device === 'tablet' ? 950 : '100%',
                borderRadius: device === 'mobile' ? 36 : device === 'tablet' ? 24 : 12,
                borderWidth: device === 'desktop' ? 1 : 8,
                borderColor: device === 'desktop' ? '#1F2937' : '#1E293B',
              },
            ]}
          >
            {/* Mobile / Tablet Notch & Header Bar */}
            {device === 'mobile' && (
              <XStack
                height={28}
                backgroundColor={tokens.background}
                justifyContent="center"
                alignItems="center"
              >
                <View
                  style={{
                    width: 100,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#1E293B',
                    marginTop: 4,
                  }}
                />
              </XStack>
            )}

            {/* Inner PDP Simulation Rendered in Responsive Context */}
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <FormFactorContext.Provider value={responsiveContextValue}>
                <ProductDetailPage
                  product={activeProduct}
                  config={config}
                  presentationMode={config.presentationMode}
                />
              </FormFactorContext.Provider>
            </View>
          </View>
        </YStack>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  hardwareChassis: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
});
