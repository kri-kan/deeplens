import React from 'react';
import { XStack } from 'tamagui';
import { LuArrowLeft } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyBackButtonProps {
  onBack: () => void;
  theme: SurveyThemeTokens;
  size?: number;
}

export const SurveyBackButton: React.FC<SurveyBackButtonProps> = ({
  onBack,
  theme,
  size = 30,
}) => {
  return (
    <XStack
      cursor="pointer"
      alignItems="center"
      justifyContent="center"
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor={theme.secondaryButtonBg}
      borderColor={theme.secondaryButtonBorder}
      borderWidth={1}
      onPress={onBack}
      hoverStyle={{
        opacity: 0.85,
        transform: [{ translateX: -2 }],
      }}
      pressStyle={{ transform: [{ scale: 0.95 }] }}
      style={{ transition: 'all 0.2s ease', flexShrink: 0 }}
      role="button"
      aria-label="Go back to previous question"
    >
      <LuArrowLeft size={Math.round(size * 0.5)} color={theme.textHeading} />
    </XStack>
  );
};
