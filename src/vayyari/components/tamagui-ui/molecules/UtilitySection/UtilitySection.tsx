import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '@/theme';
import { UtilityTile, UtilityTileItem } from '../UtilityTile';

export interface UtilitySectionProps {
  title: string;
  items: UtilityTileItem[];
  onLaunchItem?: (route: string) => void;
}

export function UtilitySection({
  title,
  items,
  onLaunchItem,
}: UtilitySectionProps) {
  const { tokens } = useTheme();

  if (items.length === 0) return null;

  return (
    <YStack gap={4}>
      {/* Section Header - High Density */}
      <XStack alignItems="center" gap={6} paddingHorizontal={4}>
        <Text
          fontSize={11}
          fontWeight="800"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          {title}
        </Text>
        <XStack
          paddingHorizontal={5}
          paddingVertical={1}
          borderRadius={tokens.radius.full}
          backgroundColor={tokens.surfaceRaised}
        >
          <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
            {items.length}
          </Text>
        </XStack>
      </XStack>

      {/* High-density grid - compact container with tight spacing */}
      <XStack
        backgroundColor={tokens.surface}
        borderRadius={tokens.radius.md}
        borderWidth={1}
        borderColor={tokens.border}
        paddingVertical={6}
        paddingHorizontal={2}
        flexWrap="wrap"
        rowGap={6}
      >
        {items.map((item) => (
          <YStack key={item.id} width="25%" alignItems="center">
            <UtilityTile item={item} onPress={onLaunchItem} />
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}
