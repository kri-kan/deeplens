import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { LuArrowUpDown, LuSlidersHorizontal } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type FilterSortBottomBarProps = {
  onPressSort?: () => void;
  onPressFilter?: () => void;
  activeFilterCount?: number;
  currentSortLabel?: string;
};

export function FilterSortBottomBar({
  onPressSort,
  onPressFilter,
  activeFilterCount = 0,
  currentSortLabel,
}: FilterSortBottomBarProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      height={52}
      width="100%"
      backgroundColor={tokens.surface}
      borderTopWidth={1}
      borderTopColor={tokens.border}
      alignItems="stretch"
      shadowColor="#000000"
      shadowOpacity={0.12}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: -4 }}
      zIndex={50}
    >
      {/* SORT Button (Left Half) */}
      <XStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap={8}
        cursor="pointer"
        onPress={onPressSort}
        hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
        pressStyle={{ scale: 0.98, opacity: 0.8 }}
      >
        <LuArrowUpDown size={16} color={tokens.text} />
        <Text
          fontSize={13}
          fontWeight="800"
          letterSpacing={1.2}
          color={tokens.text}
          textTransform="uppercase"
        >
          SORT
        </Text>
        {currentSortLabel ? (
          <Text fontSize={11} color={tokens.accent} fontWeight="600" numberOfLines={1} maxWidth={70}>
            ({currentSortLabel})
          </Text>
        ) : null}
      </XStack>

      {/* Divider */}
      <YStack width={1} backgroundColor={tokens.border} marginVertical={10} />

      {/* FILTER Button (Right Half) */}
      <XStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap={8}
        cursor="pointer"
        onPress={onPressFilter}
        hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
        pressStyle={{ scale: 0.98, opacity: 0.8 }}
        position="relative"
      >
        <LuSlidersHorizontal size={16} color={tokens.text} />
        <Text
          fontSize={13}
          fontWeight="800"
          letterSpacing={1.2}
          color={tokens.text}
          textTransform="uppercase"
        >
          FILTER
        </Text>

        {activeFilterCount > 0 ? (
          <XStack
            width={18}
            height={18}
            borderRadius={9999}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={10} fontWeight="900" color={tokens.accentForeground}>
              {activeFilterCount}
            </Text>
          </XStack>
        ) : null}
      </XStack>
    </XStack>
  );
}
