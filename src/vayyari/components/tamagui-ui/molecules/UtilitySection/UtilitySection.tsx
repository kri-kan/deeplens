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
    <YStack gap={8}>
      {/* Section Header with increased heading size */}
      <XStack alignItems="center" gap={8} paddingHorizontal={4}>
        <Text
          fontSize={13}
          fontWeight="800"
          color={tokens.text}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          {title}
        </Text>
        <XStack
          paddingHorizontal={6}
          paddingVertical={1.5}
          borderRadius={tokens.radius.full}
          backgroundColor={tokens.surfaceRaised}
        >
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
            {items.length}
          </Text>
        </XStack>
      </XStack>

      {/* 4-column Grid of Pure Icon Buttons (No Section Background) */}
      <XStack
        paddingVertical={2}
        paddingHorizontal={0}
        flexWrap="wrap"
        rowGap={14}
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
