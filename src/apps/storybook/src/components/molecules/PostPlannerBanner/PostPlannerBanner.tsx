import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuLayoutGrid, LuChevronRight } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface PostPlannerBannerProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export function PostPlannerBanner({
  title = 'Post Planner & Channel Incubator',
  subtitle = 'Star catalog items, match focus & dump channels, schedule & share',
  onPress,
}: PostPlannerBannerProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: '#000000',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${subtitle}`}
    >
      <XStack alignItems="center" gap={12} flex={1}>
        <View style={[styles.iconBox, { backgroundColor: tokens.accent }]}>
          <LuLayoutGrid size={22} color="#FFFFFF" />
        </View>

        <YStack flex={1} gap={2} alignItems="flex-start">
          <Text
            fontSize={14}
            fontWeight="800"
            color={tokens.text}
            letterSpacing={0.1}
            style={{ textAlign: 'left' }}
          >
            {title}
          </Text>
          <Text
            fontSize={11}
            color={tokens.textMuted}
            numberOfLines={2}
            lineHeight={15}
            style={{ textAlign: 'left' }}
          >
            {subtitle}
          </Text>
        </YStack>
      </XStack>

      <View style={[styles.chevronBox, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
        <LuChevronRight size={18} color={tokens.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
