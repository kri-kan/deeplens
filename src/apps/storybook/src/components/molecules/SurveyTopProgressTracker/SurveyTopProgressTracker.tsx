import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyMilestoneDot } from '../../atoms/SurveyMilestoneDot';
import { SurveyProgressBar } from '../../atoms/SurveyProgressBar';
import { SurveyStepCapsule } from '../../atoms/SurveyStepCapsule';
import { SurveyProgressType } from '../../organisms/TypeformSurvey/DeepstashProgressHeader';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyTopProgressTrackerProps {
  progressType?: SurveyProgressType; // 'dots' (default) | 'percentage' | 'step'
  totalMilestones: number;
  currentMilestoneIndex: number;
  completedMilestones?: number[];
  theme: SurveyThemeTokens;
}

export const SurveyTopProgressTracker: React.FC<SurveyTopProgressTrackerProps> = ({
  progressType = 'dots',
  totalMilestones,
  currentMilestoneIndex,
  completedMilestones = [],
  theme,
}) => {
  const percentage = Math.min(100, Math.round(((currentMilestoneIndex + 1) / totalMilestones) * 100));

  return (
    <YStack width="100%">
      {/* 1. Milestone Dots Sequence */}
      {progressType === 'dots' && (
        <XStack width="100%" alignItems="center" paddingHorizontal={4} position="relative">
          {Array.from({ length: totalMilestones }).map((_, idx) => {
            const isCompleted = completedMilestones.includes(idx) || idx < currentMilestoneIndex;
            const isCurrent = idx === currentMilestoneIndex;
            const isNotLast = idx < totalMilestones - 1;

            return (
              <React.Fragment key={idx}>
                <SurveyMilestoneDot
                  index={idx}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  theme={theme}
                />

                {/* Connecting Segment Line */}
                {isNotLast && (
                  <YStack
                    flex={1}
                    height={2.5}
                    backgroundColor={idx < currentMilestoneIndex ? theme.progressBarFilled : theme.progressBarTrack}
                    style={{
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </XStack>
      )}

      {/* 2. Percentage Progress Bar */}
      {progressType === 'percentage' && (
        <YStack width="100%" paddingHorizontal={4} gap={4}>
          <XStack width="100%" justifyContent="space-between" alignItems="center">
            <Text color={theme.textMuted} fontSize={10.5} fontWeight="700">
              Survey Progress
            </Text>
            <Text color={theme.progressBarFilled} fontSize={11} fontWeight="800">
              {percentage}%
            </Text>
          </XStack>
          <SurveyProgressBar percentage={percentage} theme={theme} height={4} />
        </YStack>
      )}

      {/* 3. Top Step Tracker */}
      {progressType === 'step' && (
        <YStack width="100%" paddingHorizontal={4} gap={5}>
          <XStack width="100%" justifyContent="space-between" alignItems="center">
            <Text
              color={theme.progressBarFilled}
              fontSize={11}
              fontWeight="800"
              letterSpacing={1.2}
              textTransform="uppercase"
            >
              Step {currentMilestoneIndex + 1} of {totalMilestones}
            </Text>
            <Text color={theme.textMuted} fontSize={10.5} fontWeight="600">
              {totalMilestones - (currentMilestoneIndex + 1) === 0
                ? 'Final Question'
                : `${totalMilestones - (currentMilestoneIndex + 1)} remaining`}
            </Text>
          </XStack>

          {/* Segmented Step Capsules */}
          <XStack width="100%" gap={4} alignItems="center">
            {Array.from({ length: totalMilestones }).map((_, idx) => (
              <SurveyStepCapsule
                key={idx}
                isFilled={idx <= currentMilestoneIndex}
                theme={theme}
                height={4}
              />
            ))}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
};
