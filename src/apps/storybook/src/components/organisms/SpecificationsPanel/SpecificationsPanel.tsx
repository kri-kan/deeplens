import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  LuSparkles,
  LuRuler,
  LuShieldCheck,
  LuPackage,
  LuHeart,
  LuCopy,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuLayers,
  LuScissors,
  LuInfo,
} from 'react-icons/lu';
import { SpecificationRow } from '../../molecules/SpecificationRow/SpecificationRow';
import { SegmentedControl } from '../../atoms/SegmentedControl/SegmentedControl';
import { useTheme, useResponsive } from '../../../theme';
import {
  Spec,
  SpecificationGroup,
  SpecificationGroupIcon,
  SpecificationsPanelProps,
  SpecificationsPanelViewMode,
} from './types';

export * from './types';

// Helper to auto-partition flat specs into 3 canonical groups if groupedSpecs is omitted
export function groupSpecsAutomatically(specs: Spec[]): SpecificationGroup[] {
  const craftSpecs: Spec[] = [];
  const dimSpecs: Spec[] = [];
  const careSpecs: Spec[] = [];
  const generalSpecs: Spec[] = [];

  for (const s of specs) {
    const l = s.label.toLowerCase();
    if (
      l.includes('fabric') ||
      l.includes('weave') ||
      l.includes('origin') ||
      l.includes('motif') ||
      l.includes('pattern') ||
      l.includes('border') ||
      l.includes('pallu') ||
      l.includes('zari') ||
      l.includes('inlay') ||
      l.includes('work') ||
      l.includes('embellish') ||
      l.includes('lining') ||
      l.includes('craft') ||
      l.includes('authenticity') ||
      l.includes('silk mark')
    ) {
      craftSpecs.push(s);
    } else if (
      l.includes('stitch') ||
      l.includes('size') ||
      l.includes('sizing') ||
      l.includes('drape') ||
      l.includes('length') ||
      l.includes('blouse') ||
      l.includes('package') ||
      l.includes('waist') ||
      l.includes('bust') ||
      l.includes('flare') ||
      l.includes('ghera') ||
      l.includes('margin') ||
      l.includes('dimension') ||
      l.includes('height') ||
      l.includes('contents') ||
      l.includes('choli') ||
      l.includes('kurti') ||
      l.includes('dupatta')
    ) {
      dimSpecs.push(s);
    } else if (
      l.includes('care') ||
      l.includes('wash') ||
      l.includes('preserv') ||
      l.includes('occasion') ||
      l.includes('styling') ||
      l.includes('season') ||
      l.includes('event')
    ) {
      careSpecs.push(s);
    } else {
      generalSpecs.push(s);
    }
  }

  const groups: SpecificationGroup[] = [];

  if (craftSpecs.length > 0) {
    groups.push({
      id: 'craft-heritage',
      title: 'Craft & Handloom Heritage',
      subtitle: 'Authentic weaves, pure yarn provenance & traditional artistry',
      badge: `${craftSpecs.length} Craft Specs`,
      icon: 'heritage',
      specs: craftSpecs,
    });
  }

  if (dimSpecs.length > 0) {
    groups.push({
      id: 'dimensions-tailoring',
      title: 'Garment Dimensions & Tailoring',
      subtitle: 'Drape measurements, sizing profiles, blouse cuts & package details',
      badge: `${dimSpecs.length} Fit Specs`,
      icon: 'dimensions',
      specs: dimSpecs,
    });
  }

  if (careSpecs.length > 0) {
    groups.push({
      id: 'occasions-care',
      title: 'Occasions & Fabric Care',
      subtitle: 'Occasion styling recommendations & heirloom textile preservation guide',
      badge: `${careSpecs.length} Care Notes`,
      icon: 'care',
      specs: careSpecs,
    });
  }

  if (generalSpecs.length > 0) {
    groups.push({
      id: 'general-details',
      title: 'General Details & Dispatch',
      subtitle: 'Product identification, shipping timelines & authentic assurances',
      badge: `${generalSpecs.length} Details`,
      icon: 'general',
      specs: generalSpecs,
    });
  }

  return groups;
}

export function SpecificationsPanel({
  specs,
  groupedSpecs,
  title = 'Specifications & Craft Details',
  subtitle = 'Handloom provenance, tailored dimensions, and artisanal attributes',
  showSilkMarkBadge = true,
  silkMarkText = 'Silk Mark Certified • 100% Handloom Guarantee',
  sku,
  defaultViewMode = 'cards',
  enableViewModeToggle = true,
  defaultCollapsed = true,
  isCollapsible = true,
  borderless = false,
}: SpecificationsPanelProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const [viewMode, setViewMode] = useState<SpecificationsPanelViewMode>(defaultViewMode);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isSectionCollapsed, setIsSectionCollapsed] = useState<boolean>(
    isCollapsible ? (defaultCollapsed ?? true) : false
  );
  const [copiedSku, setCopiedSku] = useState(false);

  React.useEffect(() => {
    if (isCollapsible && defaultCollapsed !== undefined) {
      setIsSectionCollapsed(defaultCollapsed);
    }
  }, [defaultCollapsed, isCollapsible]);

  // Derive resolved groups
  const resolvedGroups = useMemo<SpecificationGroup[]>(() => {
    if (groupedSpecs && groupedSpecs.length > 0) {
      return groupedSpecs;
    }
    if (specs && specs.length > 0) {
      return groupSpecsAutomatically(specs);
    }
    return [];
  }, [groupedSpecs, specs]);

  const totalSpecCount = useMemo(() => {
    return resolvedGroups.reduce((acc, g) => acc + g.specs.length, 0);
  }, [resolvedGroups]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleCopySku = () => {
    if (!sku) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sku);
    }
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  // Render group icon helper
  const renderGroupIcon = (icon?: SpecificationGroupIcon) => {
    const iconSize = 15;
    switch (icon) {
      case 'heritage':
        return <LuSparkles size={iconSize} color={tokens.accent} />;
      case 'dimensions':
        return <LuRuler size={iconSize} color="#3B82F6" />;
      case 'care':
        return <LuHeart size={iconSize} color="#EC4899" />;
      case 'scissors':
        return <LuScissors size={iconSize} color="#F59E0B" />;
      case 'package':
        return <LuPackage size={iconSize} color="#10B981" />;
      default:
        return <LuLayers size={iconSize} color={tokens.accent} />;
    }
  };

  // Filter groups if in tabbed view
  const visibleGroups = useMemo(() => {
    if (viewMode === 'tabs' && activeCategoryTab !== 'all') {
      return resolvedGroups.filter((g) => g.id === activeCategoryTab);
    }
    return resolvedGroups;
  }, [resolvedGroups, viewMode, activeCategoryTab]);

  return (
    <YStack
      paddingHorizontal={borderless ? 4 : (isMobile ? 12 : 16)}
      paddingTop={borderless ? 12 : (isMobile ? 16 : 24)}
      paddingBottom={16}
      gap={14}
    >
      {/* Header Row (Pressable when collapsible) */}
      <YStack gap={6}>
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <Pressable
            onPress={() => isCollapsible && setIsSectionCollapsed((prev) => !prev)}
            hitSlop={8}
            style={{ cursor: isCollapsible ? 'pointer' : 'default' } as any}
          >
            <XStack alignItems="center" gap={8}>
              <Text
                fontSize={isMobile ? 18 : 20}
                fontWeight="800"
                letterSpacing={-0.5}
                color={tokens.text}
              >
                {title || 'Specifications & Craft Details'} ({totalSpecCount})
              </Text>
              {isCollapsible && (
                <XStack padding={4}>
                  {isSectionCollapsed ? (
                    <LuChevronDown size={18} color={tokens.text} />
                  ) : (
                    <LuChevronUp size={18} color={tokens.text} />
                  )}
                </XStack>
              )}
            </XStack>
          </Pressable>
        </XStack>

        {subtitle && (
          <Text fontSize={13} color={tokens.textSecondary} lineHeight={18}>
            {subtitle}
          </Text>
        )}
      </YStack>

      {!isSectionCollapsed && (
        <>

      {/* Authenticity Guarantee Banner */}
      {showSilkMarkBadge && (
        <XStack
          backgroundColor={tokens.surfaceRaised}
          borderRadius={12}
          borderWidth={1}
          borderColor={`${tokens.accent}33`}
          paddingHorizontal={12}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
          gap={10}
          flexWrap="wrap"
        >
          <XStack alignItems="center" gap={8} flex={1} minWidth={200}>
            <XStack
              width={26}
              height={26}
              borderRadius={13}
              backgroundColor={`${tokens.accent}1A`}
              alignItems="center"
              justifyContent="center"
            >
              <LuShieldCheck size={16} color={tokens.accent} />
            </XStack>
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                {silkMarkText}
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                Ministry of Textiles certified testing • Authenticated direct weaver consignment
              </Text>
            </YStack>
          </XStack>

          <XStack
            backgroundColor={`${tokens.accent}15`}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={8}
          >
            <Text fontSize={10} fontWeight="700" color={tokens.accent} letterSpacing={0.5}>
              100% PURE
            </Text>
          </XStack>
        </XStack>
      )}



      {/* Main Groups Rendering */}
      {visibleGroups.length === 0 ? (
        <YStack
          padding={24}
          alignItems="center"
          justifyContent="center"
          borderRadius={14}
          borderWidth={1}
          borderColor={tokens.border}
          gap={8}
        >
          <LuInfo size={24} color={tokens.textSecondary} />
          <Text fontSize={13} color={tokens.textSecondary} textAlign="center">
            No specifications available for this product.
          </Text>
        </YStack>
      ) : (
        <YStack gap={14}>
          {visibleGroups.map((group) => {
            const isCollapsed = viewMode === 'accordion' && Boolean(collapsedGroups[group.id]);

            return (
              <YStack
                key={group.id}
                borderWidth={1}
                borderColor={tokens.border}
                borderRadius={14}
                backgroundColor={tokens.surface}
                overflow="hidden"
              >
                {/* Category Header */}
                <Pressable
                  onPress={() => viewMode === 'accordion' && toggleGroupCollapse(group.id)}
                  style={[
                    styles.groupHeader,
                    {
                      backgroundColor: tokens.surfaceRaised,
                      borderBottomWidth: isCollapsed ? 0 : 1,
                      borderBottomColor: tokens.border,
                    },
                  ]}
                >
                  <XStack justifyContent="space-between" alignItems="center" width="100%">
                    <XStack alignItems="center" gap={10} flex={1}>
                      <XStack
                        width={28}
                        height={28}
                        borderRadius={14}
                        backgroundColor={tokens.surface}
                        borderWidth={1}
                        borderColor={tokens.border}
                        alignItems="center"
                        justifyContent="center"
                      >
                        {renderGroupIcon(group.icon)}
                      </XStack>
                      <YStack flex={1}>
                        <XStack alignItems="center" gap={8} flexWrap="wrap">
                          <Text fontSize={13.5} fontWeight="800" color={tokens.text}>
                            {group.title}
                          </Text>
                          {group.badge && (
                            <XStack
                              backgroundColor={tokens.surface}
                              paddingHorizontal={6}
                              paddingVertical={1.5}
                              borderRadius={8}
                              borderWidth={1}
                              borderColor={tokens.border}
                            >
                              <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                                {group.badge}
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                        {group.subtitle && (
                          <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
                            {group.subtitle}
                          </Text>
                        )}
                      </YStack>
                    </XStack>

                    {viewMode === 'accordion' && (
                      <XStack padding={4}>
                        {isCollapsed ? (
                          <LuChevronDown size={16} color={tokens.textSecondary} />
                        ) : (
                          <LuChevronUp size={16} color={tokens.textSecondary} />
                        )}
                      </XStack>
                    )}
                  </XStack>
                </Pressable>

                {/* Rows Container */}
                {!isCollapsed && (
                  <YStack>
                    {isDesktop ? (
                      // Desktop 2-Column Responsive Layout
                      <XStack flexWrap="wrap">
                        {group.specs.map((s, i) => (
                          <YStack
                            key={s.label}
                            width="50%"
                            style={{
                              borderRightWidth: i % 2 === 0 ? 1 : 0,
                              borderRightColor: tokens.border,
                            }}
                          >
                            <SpecificationRow
                              label={s.label}
                              value={s.value}
                              alt={Math.floor(i / 2) % 2 === 1}
                            />
                          </YStack>
                        ))}
                      </XStack>
                    ) : (
                      // Mobile & Tablet Stacked Rows
                      group.specs.map((s, i) => (
                        <SpecificationRow
                          key={s.label}
                          label={s.label}
                          value={s.value}
                          alt={i % 2 === 1}
                        />
                      ))
                    )}
                  </YStack>
                )}
              </YStack>
            );
          })}
        </YStack>
      )}

        </>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  skuPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryScrollContainer: {
    paddingRight: 8,
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  groupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
