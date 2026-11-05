import React from 'react';
import { XStack } from 'tamagui';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyProgressBarProps {
  percentage: number; // 0 to 100
  theme: SurveyThemeTokens;
  height?: number;
}

export const SurveyProgressBar: React.FC<SurveyProgressBarProps> = ({
  percentage,
  theme,
  height = 4,
}) => {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <XStack
      width="100%"
      height={height}
      borderRadius={height / 2}
      backgroundColor={theme.progressBarTrack}
      overflow="hidden"
    >
      <XStack
        width={`${clampedPercentage}%`}
        height="100%"
        borderRadius={height / 2}
        backgroundColor={theme.progressBarFilled}
        style={{
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </XStack>
  );
};
