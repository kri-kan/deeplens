import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
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
    <YStack gap={10}>
      {/* Section Header */}
      <XStack alignItems="center" gap={8} paddingHorizontal={2}>
        <Text
          fontSize={13}
          fontWeight="800"
          color={tokens.text}
          textTransform="uppercase"
          letterSpacing={0.6}
        >
          {title}
        </Text>
        <XStack
          paddingHorizontal={6}
          paddingVertical={1}
          borderRadius={tokens.radius.full}
          backgroundColor={tokens.surfaceRaised}
          borderWidth={1}
          borderColor={tokens.border}
        >
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
            {items.length}
          </Text>
        </XStack>
      </XStack>

      {/* Grid of Tiles */}
      <XStack flexWrap="wrap" gap={10}>
        {items.map((item) => (
          <YStack key={item.id} width="48%" flexGrow={1} flexBasis={140}>
            <UtilityTile item={item} onPress={onLaunchItem} />
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}
