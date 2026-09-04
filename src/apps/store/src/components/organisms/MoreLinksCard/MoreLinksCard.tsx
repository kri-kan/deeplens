import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type MoreLinksCardProps = {
  links: string[];
  onPress?: (label: string) => void;
};

export function MoreLinksCard({ links, onPress }: MoreLinksCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack paddingHorizontal={16} paddingTop={24} paddingBottom={12}>
      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={16}
        overflow="hidden"
      >
        {links.map((label, i) => (
          <XStack
            key={label}
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={18}
            borderBottomWidth={i < links.length - 1 ? 1 : 0}
            borderBottomColor={tokens.border}
            cursor="pointer"
            onPress={() => onPress?.(label)}
            hoverStyle={{
              backgroundColor: tokens.surfaceRaised,
            }}
          >
            <Text fontSize={15} fontWeight="600" color={tokens.text}>
              {label}
            </Text>
            <Text fontSize={20} color={tokens.accent} fontWeight="700">
              ›
            </Text>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}
