import React from 'react';
import { ScrollView } from 'react-native';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type WishlistFilterType = 'All' | 'Sarees' | 'Lehengas' | 'Jewellery' | 'In Stock Only';

export type WishlistFilterPillsProps = {
  selectedFilter: WishlistFilterType;
  counts?: Record<WishlistFilterType, number>;
  onSelectFilter: (filter: WishlistFilterType) => void;
};

export function WishlistFilterPills({
  selectedFilter = 'All',
  counts,
  onSelectFilter,
}: WishlistFilterPillsProps) {
  const { tokens } = useTheme();

  const filters: WishlistFilterType[] = ['All', 'Sarees', 'Lehengas', 'Jewellery', 'In Stock Only'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {filters.map((f) => {
        const isSelected = selectedFilter === f;
        const count = counts?.[f];

        return (
          <XStack
            key={f}
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={20}
            cursor="pointer"
            backgroundColor={isSelected ? '#e53935' : tokens.surface}
            borderWidth={1}
            borderColor={isSelected ? '#e53935' : tokens.border}
            alignItems="center"
            gap={6}
            onPress={() => onSelectFilter(f)}
            hoverStyle={!isSelected ? { borderColor: tokens.borderStrong } : { scale: 1.02 }}
            pressStyle={{ scale: 0.96 }}
          >
            <Text
              fontSize={12}
              fontWeight={isSelected ? '800' : '600'}
              color={isSelected ? '#ffffff' : tokens.text}
            >
              {f}
            </Text>
            {count !== undefined && (
              <Text
                fontSize={11}
                fontWeight="700"
                color={isSelected ? 'rgba(255,255,255,0.85)' : tokens.textMuted}
              >
                ({count})
              </Text>
            )}
          </XStack>
        );
      })}
    </ScrollView>
  );
}
