import React from 'react';
import { YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type PromoBannerProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function PromoBanner({
  eyebrow = 'Limited time',
  title,
  subtitle = 'Fresh arrivals with handcrafted details',
}: PromoBannerProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      backgroundColor={tokens.surfaceRaised}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={20}
      padding={24}
      gap={6}
      hoverStyle={{
        borderColor: tokens.accent,
      }}
    >
      <Text
        fontSize={11}
        fontWeight="800"
        color={tokens.accent}
        textTransform="uppercase"
        letterSpacing={1.5}
      >
        {eyebrow}
      </Text>
      <Text
        fontSize={26}
        fontWeight="800"
        color={tokens.text}
        letterSpacing={-0.6}
      >
        {title}
      </Text>
      <Text
        fontSize={14}
        color={tokens.textSecondary}
        lineHeight={20}
      >
        {subtitle}
      </Text>
    </YStack>
  );
}
