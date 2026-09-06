import React, { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuFilter, LuSearch, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type FilterOption = {
  id: string;
  label: string;
  count: number;
};

export type FilterFacet = {
  id: string;
  label: string;
  options: FilterOption[];
};

export type FilterDrawerProps = {
  facets: FilterFacet[];
  selectedValues: Record<string, string[]>; // facetId -> optionId[]
  onApply: (selected: Record<string, string[]>) => void;
  onClose: () => void;
};

export function FilterDrawer({
  facets,
  selectedValues: initialSelected,
  onApply,
  onClose,
}: FilterDrawerProps) {
  const { tokens } = useTheme();
  const [activeFacetId, setActiveFacetId] = useState<string>(facets[0]?.id || 'fabric');
  const [selected, setSelected] = useState<Record<string, string[]>>(initialSelected);
  const [searchQuery, setSearchQuery] = useState('');

  const activeFacet = facets.find((f) => f.id === activeFacetId) || facets[0];

  const toggleOption = (facetId: string, optionId: string) => {
    setSelected((prev) => {
      const current = prev[facetId] || [];
      const exists = current.includes(optionId);
      const next = exists ? current.filter((id) => id !== optionId) : [...current, optionId];
      return {
        ...prev,
        [facetId]: next,
      };
    });
  };

  const handleClearAll = () => {
    setSelected({});
  };

  const filteredOptions = activeFacet.options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSelectedCount = Object.values(selected).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.5)"
      zIndex={300}
    >
      <YStack
        flex={1}
        backgroundColor={tokens.surface}
        borderTopLeftRadius={18}
        borderTopRightRadius={18}
        overflow="hidden"
      >
        {/* Top Header */}
        <XStack
          height={56}
          paddingHorizontal={20}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          backgroundColor={tokens.surface}
        >
          <XStack alignItems="center" gap={8}>
            <LuFilter size={17} color={tokens.text} />
            <Text fontSize={15} fontWeight="900" letterSpacing={0.8} color={tokens.text}>
              FILTERS
            </Text>
            {totalSelectedCount > 0 ? (
              <XStack
                paddingHorizontal={7}
                paddingVertical={2}
                borderRadius={9999}
                backgroundColor={tokens.accent}
              >
                <Text fontSize={10} fontWeight="800" color={tokens.accentForeground}>
                  {totalSelectedCount}
                </Text>
              </XStack>
            ) : null}
          </XStack>

          <XStack
            cursor="pointer"
            paddingVertical={6}
            paddingHorizontal={10}
            onPress={handleClearAll}
          >
            <Text
              fontSize={12}
              fontWeight="800"
              color={tokens.accent}
              letterSpacing={0.5}
              textTransform="uppercase"
            >
              CLEAR ALL
            </Text>
          </XStack>
        </XStack>

        {/* 2-Column Filter Body */}
        <XStack flex={1}>
          {/* Left Column: Facet Categories */}
          <YStack
            width={130}
            backgroundColor={tokens.surfaceRaised}
            borderRightWidth={1}
            borderRightColor={tokens.border}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {facets.map((facet) => {
                const isActive = facet.id === activeFacetId;
                const count = selected[facet.id]?.length || 0;

                return (
                  <XStack
                    key={facet.id}
                    paddingVertical={15}
                    paddingHorizontal={14}
                    alignItems="center"
                    justifyContent="space-between"
                    cursor="pointer"
                    backgroundColor={isActive ? tokens.surface : 'transparent'}
                    borderLeftWidth={3}
                    borderLeftColor={isActive ? tokens.accent : 'transparent'}
                    onPress={() => {
                      setActiveFacetId(facet.id);
                      setSearchQuery('');
                    }}
                  >
                    <Text
                      fontSize={13}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? tokens.text : tokens.textSecondary}
                      numberOfLines={1}
                      flex={1}
                    >
                      {facet.label}
                    </Text>

                    {count > 0 ? (
                      <XStack
                        width={18}
                        height={18}
                        borderRadius={9999}
                        backgroundColor={tokens.accent}
                        alignItems="center"
                        justifyContent="center"
                        marginLeft={4}
                      >
                        <Text fontSize={10} fontWeight="800" color={tokens.accentForeground}>
                          {count}
                        </Text>
                      </XStack>
                    ) : null}
                  </XStack>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Right Column: Facet Options & Search */}
          <YStack flex={1} backgroundColor={tokens.surface}>
            {/* Search within facet */}
            <XStack
              height={44}
              paddingHorizontal={14}
              alignItems="center"
              borderBottomWidth={1}
              borderBottomColor={tokens.border}
              backgroundColor={tokens.surface}
            >
              <LuSearch size={15} color={tokens.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search by ${activeFacet.label}`}
                placeholderTextColor={tokens.textMuted}
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: tokens.text,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                }}
              />
            </XStack>

            {/* Checkbox Options List */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <YStack>
                {filteredOptions.map((opt) => {
                  const isChecked = (selected[activeFacet.id] || []).includes(opt.id);

                  return (
                    <XStack
                      key={opt.id}
                      paddingVertical={13}
                      paddingHorizontal={16}
                      alignItems="center"
                      justifyContent="space-between"
                      borderBottomWidth={1}
                      borderBottomColor={tokens.border}
                      cursor="pointer"
                      backgroundColor={isChecked ? tokens.accentSubtle : 'transparent'}
                      onPress={() => toggleOption(activeFacet.id, opt.id)}
                    >
                      <XStack alignItems="center" gap={10} flex={1}>
                        <XStack
                          width={20}
                          height={20}
                          borderRadius={4}
                          borderWidth={1.5}
                          borderColor={isChecked ? tokens.accent : tokens.borderStrong}
                          backgroundColor={isChecked ? tokens.accent : 'transparent'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {isChecked ? (
                            <LuCheck size={13} color={tokens.accentForeground} strokeWidth={3} />
                          ) : null}
                        </XStack>
                        <Text
                          fontSize={13}
                          fontWeight={isChecked ? '700' : '500'}
                          color={tokens.text}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                      </XStack>

                      <Text fontSize={12} color={tokens.textMuted} fontWeight="500">
                        {opt.count}
                      </Text>
                    </XStack>
                  );
                })}
              </YStack>
            </ScrollView>
          </YStack>
        </XStack>

        {/* Bottom Footer Actions */}
        <XStack
          height={58}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          backgroundColor={tokens.surface}
          alignItems="stretch"
        >
          {/* Close button */}
          <XStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            borderRightWidth={1}
            borderRightColor={tokens.border}
            onPress={onClose}
            hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            pressStyle={{ scale: 0.98 }}
          >
            <Text
              fontSize={13}
              fontWeight="800"
              letterSpacing={1}
              textTransform="uppercase"
              color={tokens.textSecondary}
            >
              CLOSE
            </Text>
          </XStack>

          {/* Apply button */}
          <XStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            backgroundColor={tokens.accent}
            onPress={() => {
              onApply(selected);
              onClose();
            }}
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.98 }}
          >
            <Text
              fontSize={13}
              fontWeight="800"
              letterSpacing={1}
              textTransform="uppercase"
              color={tokens.accentForeground}
            >
              APPLY {totalSelectedCount > 0 ? `(${totalSelectedCount})` : ''}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
