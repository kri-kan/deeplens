import React from 'react';
import { Text } from 'tamagui';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyQuestionKickerProps {
  text: string;
  theme: SurveyThemeTokens;
}

export const SurveyQuestionKicker: React.FC<SurveyQuestionKickerProps> = ({
  text,
  theme,
}) => {
  return (
    <Text
      color={theme.kickerColor}
      fontSize={10.5}
      fontWeight="800"
      letterSpacing={1.6}
      textTransform="uppercase"
      textAlign="center"
    >
      {text}
    </Text>
  );
};
