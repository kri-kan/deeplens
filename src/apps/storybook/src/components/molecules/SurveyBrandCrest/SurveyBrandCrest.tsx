import React from 'react';
import { XStack, Text } from 'tamagui';
import { LuFlame } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyBrandCrestProps {
  brandName?: string;
  optionalHeading?: string;
  theme: SurveyThemeTokens;
  icon?: React.ReactNode;
}

export const SurveyBrandCrest: React.FC<SurveyBrandCrestProps> = ({
  brandName = 'Vayyari',
  optionalHeading,
  theme,
  icon,
}) => {
  return (
    <XStack alignItems="center" gap={6} flex={1} minWidth={0}>
      {icon || <LuFlame size={17} color={theme.kickerColor} style={{ flexShrink: 0 }} />}
      <Text
        color={theme.textHeading}
        fontSize={15}
        fontWeight="800"
        letterSpacing={0.4}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {brandName}
        {optionalHeading && (
          <Text color={theme.textMuted} fontSize={13} fontWeight="500">
            {' — '}{optionalHeading}
          </Text>
        )}
      </Text>
    </XStack>
  );
};
