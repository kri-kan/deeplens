import React from 'react';
import { XStack, YStack } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyMilestoneDotProps {
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  theme: SurveyThemeTokens;
}

export const SurveyMilestoneDot: React.FC<SurveyMilestoneDotProps> = ({
  index,
  isCompleted,
  isCurrent,
  theme,
}) => {
  return (
    <XStack
      width={18}
      height={18}
      borderRadius={9}
      backgroundColor={
        isCompleted
          ? theme.progressBarFilled
          : isCurrent
          ? theme.backgroundColor
          : theme.backgroundColor
      }
      borderColor={
        isCompleted
          ? theme.progressBarFilled
          : isCurrent
          ? theme.progressBarFilled
          : theme.nodeUpcoming
      }
      borderWidth={isCurrent ? 3 : 2}
      justifyContent="center"
      alignItems="center"
      zIndex={2}
      style={{
        transition: 'all 0.3s ease',
        boxShadow: isCurrent ? `0 0 8px ${theme.progressBarFilled}88` : 'none',
      }}
    >
      {isCompleted ? (
        <LuCheck size={11} color="#ffffff" strokeWidth={3} />
      ) : isCurrent ? (
        <XStack
          width={6}
          height={6}
          borderRadius={3}
          backgroundColor={theme.progressBarFilled}
        />
      ) : null}
    </XStack>
  );
};
