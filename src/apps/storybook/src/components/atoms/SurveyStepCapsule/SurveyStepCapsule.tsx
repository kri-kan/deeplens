import React from 'react';
import { YStack } from 'tamagui';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyStepCapsuleProps {
  isFilled: boolean;
  theme: SurveyThemeTokens;
  height?: number;
}

export const SurveyStepCapsule: React.FC<SurveyStepCapsuleProps> = ({
  isFilled,
  theme,
  height = 4,
}) => {
  return (
    <YStack
      flex={1}
      height={height}
      borderRadius={height / 2}
      backgroundColor={isFilled ? theme.progressBarFilled : theme.progressBarTrack}
      style={{
        transition: 'background-color 0.3s ease',
      }}
    />
  );
};
