import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyThemeTokens } from './themeConfig';

export interface LikertScaleRowProps {
  selectedValue?: number; // 1 to 5
  onSelect: (value: number) => void;
  minLabel?: string; // e.g. "Don't agree"
  maxLabel?: string; // e.g. "Agree"
  theme: SurveyThemeTokens;
}

export const LikertScaleRow: React.FC<LikertScaleRowProps> = ({
  selectedValue,
  onSelect,
  minLabel = "Don't agree",
  maxLabel = 'Agree',
  theme,
}) => {
  const values = [1, 2, 3, 4, 5];

  return (
    <YStack width="100%" maxWidth={540} gap={12} marginHorizontal="auto">
      {/* 5 Rating Cards Row */}
      <XStack justifyContent="space-between" alignItems="center" gap={8} width="100%">
        {values.map((val) => {
          const isSelected = selectedValue === val;

          return (
            <XStack
              key={val}
              cursor="pointer"
              flex={1}
              height={64}
              backgroundColor={isSelected ? theme.surfaceSelectedBg : theme.surfaceColor}
              borderColor={isSelected ? theme.surfaceSelectedBorder : theme.surfaceBorder}
              borderWidth={isSelected ? 2.5 : 1}
              borderRadius={12}
              justifyContent="center"
              alignItems="center"
              hoverStyle={{
                borderColor: theme.surfaceHoverBorder,
                transform: [{ translateY: -2 }],
              }}
              pressStyle={{ transform: [{ scale: 0.96 }] }}
              onPress={() => onSelect(val)}
              style={{
                transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: isSelected
                  ? `0 4px 16px ${theme.surfaceSelectedBorder}40`
                  : '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text
                color={isSelected ? theme.surfaceSelectedBorder : theme.textHeading}
                fontSize={20}
                fontWeight={isSelected ? '800' : '700'}
              >
                {val}
              </Text>
            </XStack>
          );
        })}
      </XStack>

      {/* Min vs Max Text Labels (e.g. Don't agree vs Agree) */}
      <XStack justifyContent="space-between" width="100%" paddingHorizontal={4}>
        <Text color={theme.textMuted} fontSize={12} fontWeight="500">
          {minLabel}
        </Text>
        <Text color={theme.textMuted} fontSize={12} fontWeight="500">
          {maxLabel}
        </Text>
      </XStack>
    </YStack>
  );
};
