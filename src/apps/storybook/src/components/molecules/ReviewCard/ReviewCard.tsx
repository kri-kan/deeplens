import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type ReviewCardProps = {
  initials: string;
  name: string;
  date: string;
  rating: number;
  text: string;
};

export function ReviewCard({
  initials,
  name,
  date,
  rating,
  text,
}: ReviewCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={14}
      padding={16}
      gap={10}
      hoverStyle={{
        borderColor: tokens.accent,
      }}
    >
      <XStack alignItems="center" gap={10}>
        <XStack
          width={36}
          height={36}
          borderRadius={9999}
          backgroundColor={tokens.accentSubtle}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={12} fontWeight="800" color={tokens.accent}>
            {initials}
          </Text>
        </XStack>

        <YStack flex={1}>
          <Text fontSize={13} fontWeight="700" color={tokens.text}>
            {name}
          </Text>
          <Text fontSize={11} color={tokens.textMuted} marginTop={1}>
            {date}
          </Text>
        </YStack>

        <XStack gap={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Text
              key={i}
              fontSize={13}
              color={i < rating ? tokens.success : tokens.border}
            >
              ★
            </Text>
          ))}
        </XStack>
      </XStack>

      <Text fontSize={14} color={tokens.text} lineHeight={22}>
        {text}
      </Text>

      <XStack gap={16} paddingTop={4}>
        <XStack alignItems="center" gap={4} cursor="pointer" hoverStyle={{ opacity: 0.7 }}>
          <Text fontSize={12} color={tokens.textSecondary} fontWeight="600">
            👍 Helpful
          </Text>
        </XStack>
        <XStack alignItems="center" gap={4} cursor="pointer" hoverStyle={{ opacity: 0.7 }}>
          <Text fontSize={12} color={tokens.textSecondary} fontWeight="600">
            💬 Reply
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
