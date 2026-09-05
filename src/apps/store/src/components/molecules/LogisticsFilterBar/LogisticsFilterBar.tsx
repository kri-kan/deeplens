import React from 'react';
import { TextInput, ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSearch,
  LuClock,
  LuPackage,
  LuTruck,
  LuTriangleAlert,
  LuCheck,
  LuX,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface LogisticsFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedFilter: string;
  onFilterChange: (val: string) => void;
  filters?: FilterOption[];
}

export const DEFAULT_LOGISTICS_FILTERS: FilterOption[] = [
  { label: 'All', value: 'All' },
  { label: 'Pending Fulfillment', value: 'PendingFulfillment' },
  { label: 'In Procurement', value: 'InProcurement' },
  { label: 'In Transit', value: 'InTransit' },
  { label: 'NDR Action Needed', value: 'NdrActionNeeded' },
  { label: 'Delivered', value: 'Delivered' },
];

export function LogisticsFilterBar({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  filters = DEFAULT_LOGISTICS_FILTERS,
}: LogisticsFilterBarProps) {
  const { tokens } = useTheme();

  const getFilterIcon = (val: string, color: string) => {
    switch (val) {
      case 'PendingFulfillment':
        return <LuClock size={14} color={color} />;
      case 'InProcurement':
        return <LuPackage size={14} color={color} />;
      case 'InTransit':
        return <LuTruck size={14} color={color} />;
      case 'NdrActionNeeded':
        return <LuTriangleAlert size={14} color={color} />;
      case 'Delivered':
        return <LuCheck size={14} color={color} />;
      default:
        return null;
    }
  };

  return (
    <YStack gap={10}>
      {/* Search Input Bar */}
      <XStack
        backgroundColor={tokens.surface}
        borderRadius={tokens.radius.md}
        borderWidth={1}
        borderColor={tokens.border}
        paddingHorizontal={12}
        height={42}
        alignItems="center"
        gap={8}
      >
        <LuSearch size={16} color={tokens.textMuted} />
        <TextInput
          accessibilityLabel="Search orders input"
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search order ID, buyer, phone, AWB, vendor..."
          placeholderTextColor={tokens.textMuted}
          style={
            {
              flex: 1,
              fontSize: 13,
              color: tokens.text,
              outlineStyle: 'none',
            } as any
          }
        />
        {searchQuery.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search input"
            onPress={() => onSearchChange('')}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              padding={4}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
            >
              <LuX size={12} color={tokens.textMuted} />
            </XStack>
          </Pressable>
        )}
      </XStack>

      {/* Horizontal Filter Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.value;
          const isNdr = filter.value === 'NdrActionNeeded';
          const activeColor = isNdr ? tokens.error : tokens.accent;
          const activeBg = isNdr ? `${tokens.error}14` : tokens.accent;
          const activeTextColor = isNdr ? tokens.error : tokens.surface;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${filter.label}`}
              onPress={() => onFilterChange(filter.value)}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                alignItems="center"
                gap={6}
                paddingVertical={7}
                paddingHorizontal={12}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor={isSelected ? activeColor : tokens.border}
                backgroundColor={isSelected ? activeBg : tokens.surface}
              >
                {getFilterIcon(
                  filter.value,
                  isSelected ? activeTextColor : tokens.textMuted
                )}
                <Text
                  fontSize={12}
                  fontWeight={isSelected ? '700' : '500'}
                  color={isSelected ? activeTextColor : tokens.text}
                >
                  {filter.label}
                </Text>
                {typeof filter.count === 'number' && (
                  <XStack
                    paddingHorizontal={6}
                    paddingVertical={1}
                    borderRadius={tokens.radius.full}
                    backgroundColor={
                      isSelected ? 'rgba(255,255,255,0.2)' : tokens.surfaceRaised
                    }
                  >
                    <Text
                      fontSize={10}
                      fontWeight="700"
                      color={isSelected ? activeTextColor : tokens.textMuted}
                    >
                      {filter.count}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </Pressable>
          );
        })}
      </ScrollView>
    </YStack>
  );
}
