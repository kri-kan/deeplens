import React from 'react';
import { XStack, Text } from 'tamagui';
import { LuChevronRight } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyNavButtonProps {
  label: string;
  onPress: () => void;
  isActive?: boolean;
  theme: SurveyThemeTokens;
  icon?: React.ReactNode;
}

export const SurveyNavButton: React.FC<SurveyNavButtonProps> = ({
  label,
  onPress,
  isActive = true,
  theme,
  icon,
}) => {
  return (
    <XStack
      cursor="pointer"
      alignItems="center"
      gap={3}
      paddingVertical={6}
      paddingHorizontal={8}
      onPress={onPress}
      hoverStyle={{
        opacity: 0.75,
        transform: [{ translateX: 2 }],
      }}
      pressStyle={{
        transform: [{ scale: 0.97 }],
      }}
      style={{
        transition: 'all 0.18s ease',
      }}
      role="button"
      aria-label={label}
    >
      <Text
        color={isActive ? theme.textHeading : theme.textMuted}
        fontSize={16}
        fontWeight="800"
        letterSpacing={0.4}
      >
        {label}
      </Text>
      {icon || (
        <LuChevronRight
          size={18}
          color={isActive ? theme.textHeading : theme.textMuted}
          strokeWidth={3}
        />
      )}
    </XStack>
  );
};
