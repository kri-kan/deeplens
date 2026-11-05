import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyMudrasBadge } from '../../atoms/SurveyMudrasBadge';
import { SurveyNavButton } from '../../atoms/SurveyNavButton';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyStickyFooterProps {
  hasRewards?: boolean;
  stepRewardMudras?: number;
  surveyTotalMudras?: number;
  hasAnswer?: boolean;
  isLastStep?: boolean;
  onNext: () => void;
  onSkip: () => void;
  theme: SurveyThemeTokens;
  maxWidth?: number | string;
}

export const SurveyStickyFooter: React.FC<SurveyStickyFooterProps> = ({
  hasRewards = false,
  stepRewardMudras = 175,
  surveyTotalMudras = 700,
  hasAnswer = false,
  isLastStep = false,
  onNext,
  onSkip,
  theme,
  maxWidth = 440,
}) => {
  const nextLabel = hasAnswer
    ? isLastStep
      ? 'Finish & Claim VIP Pass'
      : 'Next'
    : 'Skip';

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      zIndex={50}
      backgroundColor={theme.backgroundColor}
      paddingHorizontal={14}
      paddingVertical={14}
    >
      <XStack
        width="100%"
        maxWidth={maxWidth}
        marginHorizontal="auto"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Left: Page's respective points + Total coins this survey carries (NO Step n of m) */}
        {hasRewards ? (
          <XStack alignItems="center" gap={6} flexShrink={1} minWidth={0}>
            <SurveyMudrasBadge
              amount={stepRewardMudras}
              prefix="+"
              variant="chip"
              theme={theme}
            />
            <Text
              color={theme.textMuted}
              fontSize={11}
              fontWeight="600"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              • Survey carries {surveyTotalMudras} Mudras
            </Text>
          </XStack>
        ) : (
          <XStack />
        )}

        {/* Right: Bolds Text Without Background Next / Skip Button */}
        <SurveyNavButton
          label={nextLabel}
          onPress={hasAnswer ? onNext : onSkip}
          isActive={hasAnswer}
          theme={theme}
        />
      </XStack>
    </YStack>
  );
};
