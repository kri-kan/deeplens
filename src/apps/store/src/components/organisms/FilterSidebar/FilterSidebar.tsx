import React, { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuFilter, LuMenu, LuCheck, LuChevronDown, LuChevronUp, LuX, LuSearch } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { FilterFacet } from '../FilterDrawer/FilterDrawer';

export type FilterSidebarProps = {
  facets: FilterFacet[];
  selectedValues: Record<string, string[]>;
  onToggleOption: (facetId: string, optionId: string) => void;
  onClearAll: () => void;
  isDrawer?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
};

export function FilterSidebar({
  facets,
  selectedValues,
  onToggleOption,
  onClearAll,
  isDrawer = false,
  onClose,
  onToggleCollapse,
}: FilterSidebarProps) {
  const { tokens } = useTheme();

  // Track expanded state for each facet (default: all expanded)
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    facets.forEach((f) => {
      initial[f.id] = true;
    });
    return initial;
  });

  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  const toggleFacet = (facetId: string) => {
    setExpandedFacets((prev) => ({
      ...prev,
      [facetId]: !prev[facetId],
    }));
  };

  const totalSelectedCount = Object.values(selectedValues).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={isDrawer ? 0 : 18}
      overflow="hidden"
      shadowColor="#000"
      shadowOpacity={isDrawer ? 0.2 : 0.04}
      shadowRadius={isDrawer ? 24 : 12}
      shadowOffset={{ width: 0, height: 4 }}
    >
      {/* Sidebar Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={14}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        {/* Left: Hamburger inside filters tab without label */}
        <XStack alignItems="center" gap={8}>
          {onToggleCollapse || (isDrawer && onClose) ? (
            <XStack
              cursor="pointer"
              padding={6}
              borderRadius={8}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
              pressStyle={{ scale: 0.94 }}
              onPress={onToggleCollapse || onClose}
              accessibilityLabel="Collapse filters"
            >
              <LuMenu size={18} color={tokens.text} />
            </XStack>
          ) : (
            <LuFilter size={18} color={tokens.text} />
          )}

          <Text fontSize={14} fontWeight="900" letterSpacing={0.8} color={tokens.text}>
            FILTERS
          </Text>

          {totalSelectedCount > 0 ? (
            <XStack
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={9999}
              backgroundColor={tokens.accent}
            >
              <Text fontSize={10} fontWeight="900" color={tokens.accentForeground}>
                {totalSelectedCount}
              </Text>
            </XStack>
          ) : null}
        </XStack>

        {/* Right: Clear All and optional Close button */}
        <XStack alignItems="center" gap={10}>
          {totalSelectedCount > 0 ? (
            <XStack cursor="pointer" onPress={onClearAll}>
              <Text
                fontSize={12}
                fontWeight="800"
                color={tokens.accent}
                letterSpacing={0.4}
                textTransform="uppercase"
                hoverStyle={{ textDecorationLine: 'underline' }}
              >
                CLEAR ALL
              </Text>
            </XStack>
          ) : null}

          {isDrawer && onClose ? (
            <XStack
              cursor="pointer"
              padding={4}
              borderRadius={6}
              onPress={onClose}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <LuX size={18} color={tokens.text} />
            </XStack>
          ) : null}
        </XStack>
      </XStack>

      {/* Scrollable Facets List */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: isDrawer ? '85%' : 750 }}>
        <YStack>
          {facets.map((facet, index) => {
            const isExpanded = expandedFacets[facet.id] ?? true;
            const facetSelected = selectedValues[facet.id] || [];
            const query = searchQueries[facet.id] || '';

            const filteredOptions = facet.options.filter((opt) =>
              opt.label.toLowerCase().includes(query.toLowerCase())
            );

            return (
              <YStack
                key={facet.id}
                borderBottomWidth={index === facets.length - 1 ? 0 : 1}
                borderBottomColor={tokens.border}
              >
                {/* Facet Header (Collapsible Accordion) */}
                <XStack
                  paddingHorizontal={18}
                  paddingVertical={14}
                  alignItems="center"
                  justifyContent="space-between"
                  cursor="pointer"
                  onPress={() => toggleFacet(facet.id)}
                  hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
                >
                  <XStack alignItems="center" gap={8}>
                    <Text fontSize={13} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
                      {facet.label}
                    </Text>
                    {facetSelected.length > 0 ? (
                      <XStack
                        width={18}
                        height={18}
                        borderRadius={9999}
                        backgroundColor={tokens.accent}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize={10} fontWeight="900" color={tokens.accentForeground}>
                          {facetSelected.length}
                        </Text>
                      </XStack>
                    ) : null}
                  </XStack>

                  {isExpanded ? (
                    <LuChevronUp size={16} color={tokens.textSecondary} />
                  ) : (
                    <LuChevronDown size={16} color={tokens.textSecondary} />
                  )}
                </XStack>

                {/* Facet Content */}
                {isExpanded ? (
                  <YStack paddingHorizontal={18} paddingBottom={14} gap={8}>
                    {/* Search inside facet if > 4 options */}
                    {facet.options.length > 4 ? (
                      <XStack
                        height={32}
                        paddingHorizontal={10}
                        borderRadius={8}
                        backgroundColor={tokens.surfaceRaised}
                        borderWidth={1}
                        borderColor={tokens.border}
                        alignItems="center"
                        marginBottom={4}
                      >
                        <LuSearch size={13} color={tokens.textMuted} style={{ marginRight: 6 }} />
                        <TextInput
                          value={query}
                          onChangeText={(text) =>
                            setSearchQueries((prev) => ({ ...prev, [facet.id]: text }))
                          }
                          placeholder={`Search ${facet.label}`}
                          placeholderTextColor={tokens.textMuted}
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: tokens.text,
                            borderWidth: 0,
                            padding: 0,
                            backgroundColor: 'transparent',
                          }}
                        />
                      </XStack>
                    ) : null}

                    {/* Checkbox Options */}
                    <YStack gap={6}>
                      {filteredOptions.map((opt) => {
                        const isChecked = facetSelected.includes(opt.id);
                        return (
                          <XStack
                            key={opt.id}
                            alignItems="center"
                            justifyContent="space-between"
                            paddingVertical={4}
                            cursor="pointer"
                            onPress={() => onToggleOption(facet.id, opt.id)}
                            hoverStyle={{ opacity: 0.85 }}
                          >
                            <XStack alignItems="center" gap={9} flex={1}>
                              <XStack
                                width={18}
                                height={18}
                                borderRadius={4}
                                borderWidth={1.5}
                                borderColor={isChecked ? tokens.accent : tokens.borderStrong}
                                backgroundColor={isChecked ? tokens.accent : 'transparent'}
                                alignItems="center"
                                justifyContent="center"
                              >
                                {isChecked ? (
                                  <LuCheck
                                    size={12}
                                    color={tokens.accentForeground}
                                    strokeWidth={3}
                                  />
                                ) : null}
                              </XStack>
                              <Text
                                fontSize={13}
                                fontWeight={isChecked ? '700' : '500'}
                                color={isChecked ? tokens.accent : tokens.text}
                                numberOfLines={1}
                              >
                                {opt.label}
                              </Text>
                            </XStack>

                            <Text fontSize={11} color={tokens.textMuted} fontWeight="500">
                              {opt.count}
                            </Text>
                          </XStack>
                        );
                      })}
                    </YStack>
                  </YStack>
                ) : null}
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
