import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ReviewCard } from '../../molecules/ReviewCard/ReviewCard';
import { useTheme } from '../../../theme';

export type Review = {
  initials: string;
  name: string;
  date: string;
  rating: number;
  text: string;
};

export type RatingsPanelProps = {
  averageRating: number;
  totalReviews: number;
  breakdown: number[];
  photoColors?: string[];
  reviews: Review[];
};

export function RatingsPanel({
  averageRating,
  totalReviews,
  breakdown,
  photoColors = [],
  reviews,
}: RatingsPanelProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      paddingHorizontal={16}
      paddingTop={24}
      paddingBottom={16}
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={16}
    >
      <Text fontSize={20} fontWeight="800" letterSpacing={-0.5} color={tokens.text} marginBottom={16}>
        Ratings &amp; Reviews
      </Text>

      {/* Aggregate and Progress Bars */}
      <XStack gap={20} alignItems="flex-start" flexWrap="wrap">
        <YStack
          alignItems="center"
          backgroundColor={tokens.surfaceRaised}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={14}
          padding={16}
          minWidth={110}
        >
          <Text fontSize={40} fontWeight="900" color={tokens.text} letterSpacing={-2} lineHeight={44}>
            {averageRating.toFixed(1)}
          </Text>
          <Text fontSize={22} color={tokens.success} marginBottom={6}>
            ★
          </Text>
          <Text fontSize={11} color={tokens.textSecondary} fontWeight="600" textAlign="center">
            {totalReviews} Verified Buyers
          </Text>
        </YStack>

        <YStack flex={1} minWidth={200} gap={7} justifyContent="center">
          {breakdown.map((count, i) => {
            const star = 5 - i;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <XStack key={star} alignItems="center" gap={8}>
                <Text fontSize={12} color={tokens.textSecondary} fontWeight="600" width={30}>
                  {star} ★
                </Text>
                <XStack flex={1} height={7} backgroundColor={tokens.border} borderRadius={9999} overflow="hidden">
                  <XStack
                    height="100%"
                    width={`${pct}%`}
                    backgroundColor={tokens.success}
                    borderRadius={9999}
                  />
                </XStack>
                <Text fontSize={12} color={tokens.textMuted} fontWeight="600" width={28} textAlign="right">
                  {count}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      </XStack>

      {/* Customer Photos */}
      {photoColors.length > 0 && (
        <YStack marginTop={20}>
          <Text fontSize={15} fontWeight="700" color={tokens.text} marginBottom={10}>
            Customer Photos ({photoColors.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap={10}>
              {photoColors.map((bg, i) => (
                <XStack
                  key={i}
                  width={72}
                  height={72}
                  borderRadius={12}
                  backgroundColor={bg}
                  borderWidth={1}
                  borderColor={tokens.border}
                  alignItems="center"
                  justifyContent="center"
                >
                  {i === photoColors.length - 1 ? (
                    <Text fontSize={14} fontWeight="800" color="#ffffff">
                      +3
                    </Text>
                  ) : null}
                </XStack>
              ))}
            </XStack>
          </ScrollView>
        </YStack>
      )}

      {/* Reviews List */}
      <YStack marginTop={20} gap={12}>
        <Text fontSize={15} fontWeight="700" color={tokens.text}>
          Customer Reviews ({reviews.length})
        </Text>
        {reviews.map((r) => (
          <ReviewCard key={r.name} {...r} />
        ))}
      </YStack>
    </YStack>
  );
}
