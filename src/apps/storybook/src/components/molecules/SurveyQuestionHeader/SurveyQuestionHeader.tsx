import React from 'react';
import { YStack, Text } from 'tamagui';
import { SurveyQuestionKicker } from '../../atoms/SurveyQuestionKicker';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyQuestionHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  theme: SurveyThemeTokens;
  maxWidth?: number | string;
}

export const SurveyQuestionHeader: React.FC<SurveyQuestionHeaderProps> = ({
  kicker,
  title,
  subtitle,
  theme,
  maxWidth = 520,
}) => {
  return (
    <YStack
      flexShrink={0}
      width="100%"
      maxWidth={maxWidth}
      marginHorizontal="auto"
      paddingHorizontal={14}
      paddingTop={2}
      paddingBottom={4}
      alignItems="center"
      gap={2}
      zIndex={25}
    >
      {/* Category Tag Kicker */}
      {kicker && <SurveyQuestionKicker text={kicker} theme={theme} />}

      {/* Question Title */}
      <Text
        color={theme.textHeading}
        fontSize={18}
        fontWeight="800"
        lineHeight={22}
        textAlign="center"
      >
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text
          color={theme.textMuted}
          fontSize={12}
          textAlign="center"
          lineHeight={15}
        >
          {subtitle}
        </Text>
      )}
    </YStack>
  );
};
