import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { SurveyThemeTokens, getSurveyTheme } from './themeConfig';

export interface MultipleChoiceOption {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
}

export interface TypeformMultipleChoiceProps {
  questionNumber: number;
  title: string;
  description?: string;
  options: MultipleChoiceOption[];
  selectedIds: string[];
  isMultiSelect?: boolean;
  onSelect: (id: string) => void;
  autoAdvanceNotice?: string;
  theme?: SurveyThemeTokens;
}

export const TypeformMultipleChoice: React.FC<TypeformMultipleChoiceProps> = ({
  questionNumber,
  title,
  description,
  options,
  selectedIds,
  isMultiSelect = false,
  onSelect,
  autoAdvanceNotice,
  theme,
}) => {
  const activeTheme = theme || getSurveyTheme('ivory-editorial');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  return (
    <YStack width="100%" maxWidth={680} gap={24} marginHorizontal="auto">
      {/* Header */}
      <YStack gap={8}>
        <XStack alignItems="center" gap={8}>
          <Text color={activeTheme.kickerColor} fontSize={13} fontWeight="700" letterSpacing={1}>
            {questionNumber} ➔
          </Text>
          <Text color={activeTheme.textMuted} fontSize={12} letterSpacing={1} textTransform="uppercase">
            {isMultiSelect ? 'Select all that apply' : 'Choose one option'}
          </Text>
        </XStack>

        <Text color={activeTheme.textHeading} fontSize={24} fontWeight="700" lineHeight={32}>
          {title}
        </Text>

        {description && (
          <Text color={activeTheme.textBody} fontSize={14} lineHeight={20}>
            {description}
          </Text>
        )}
      </YStack>

      {/* Options Stack */}
      <YStack gap={12}>
        {options.map((option, idx) => {
          const isSelected = selectedIds.includes(option.id);
          const keyLetter = letters[idx % letters.length];

          return (
            <XStack
              key={option.id}
              cursor="pointer"
              backgroundColor={isSelected ? activeTheme.surfaceSelectedBg : activeTheme.surfaceColor}
              borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
              borderWidth={isSelected ? 1.5 : 1}
              borderRadius={10}
              paddingHorizontal={16}
              paddingVertical={14}
              justifyContent="space-between"
              alignItems="center"
              hoverStyle={{
                borderColor: activeTheme.surfaceHoverBorder,
                backgroundColor: isSelected ? activeTheme.surfaceSelectedBg : activeTheme.surfaceColor,
                transform: [{ translateX: 4 }],
              }}
              pressStyle={{
                transform: [{ scale: 0.99 }],
              }}
              onPress={() => onSelect(option.id)}
              style={{
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: isSelected ? '0 4px 18px rgba(200, 90, 50, 0.16)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Left: Keycap badge & Option text */}
              <XStack alignItems="center" gap={14} flex={1}>
                {/* Keyboard keycap badge [A] */}
                <XStack
                  width={26}
                  height={26}
                  borderRadius={4}
                  backgroundColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.secondaryButtonBg}
                  borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
                  borderWidth={1}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text
                    color={isSelected ? '#FFFFFF' : activeTheme.textHeading}
                    fontSize={11}
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {keyLetter}
                  </Text>
                </XStack>

                <YStack gap={2} flex={1}>
                  <XStack alignItems="center" gap={8}>
                    <Text
                      color={activeTheme.textHeading}
                      fontSize={16}
                      fontWeight={isSelected ? '700' : '600'}
                    >
                      {option.label}
                    </Text>
                    {option.badge && (
                      <XStack
                        backgroundColor={activeTheme.accentBadgeBg}
                        paddingHorizontal={6}
                        paddingVertical={2}
                        borderRadius={4}
                      >
                        <Text color={activeTheme.accentBadgeText} fontSize={10} fontWeight="700">
                          {option.badge}
                        </Text>
                      </XStack>
                    )}
                  </XStack>

                  {option.subtitle && (
                    <Text color={activeTheme.textMuted} fontSize={12} lineHeight={16}>
                      {option.subtitle}
                    </Text>
                  )}
                </YStack>
              </XStack>

              {/* Right: Checkmark / Indicator */}
              <XStack
                width={22}
                height={22}
                borderRadius={isMultiSelect ? 4 : 11}
                backgroundColor={isSelected ? activeTheme.surfaceSelectedBorder : 'transparent'}
                borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
                borderWidth={1.5}
                justifyContent="center"
                alignItems="center"
              >
                {isSelected && <LuCheck size={14} color="#FFFFFF" />}
              </XStack>
            </XStack>
          );
        })}
      </YStack>

      {autoAdvanceNotice && (
        <Text color={activeTheme.textMuted} fontSize={11} fontStyle="italic">
          ⚡ {autoAdvanceNotice}
        </Text>
      )}
    </YStack>
  );
};
