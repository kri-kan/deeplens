import React from 'react';
import { YStack, XStack } from 'tamagui';
import { SurveyBackButton } from '../../atoms/SurveyBackButton';
import { SurveyMudrasBadge } from '../../atoms/SurveyMudrasBadge';
import { SurveyBrandCrest } from '../../molecules/SurveyBrandCrest';
import { SurveyTopProgressTracker } from '../../molecules/SurveyTopProgressTracker';
import { SurveyLanguageSelector } from '../../molecules/SurveyLanguageSelector';
import { SurveyThemeTokens } from './themeConfig';

export type SurveyProgressType = 'dots' | 'percentage' | 'step';

export interface DeepstashProgressHeaderProps {
  totalMilestones: number;
  currentMilestoneIndex: number; // 0 to totalMilestones - 1
  completedMilestones?: number[];
  canGoBack?: boolean;
  onBack?: () => void;
  brandName?: string;
  optionalHeading?: string;
  theme: SurveyThemeTokens;
  hasRewards?: boolean;
  currentMudras?: number;
  isPulsing?: boolean; // Gentle gold pulse when coins are added
  progressType?: SurveyProgressType; // 'dots' (default) | 'percentage' | 'step'
  selectedLanguage?: string;
  onLanguageChange?: (code: string) => void;
}

export const DeepstashProgressHeader: React.FC<DeepstashProgressHeaderProps> = ({
  totalMilestones = 4,
  currentMilestoneIndex = 0,
  completedMilestones = [],
  canGoBack = true,
  onBack,
  brandName = 'Vayyari',
  optionalHeading,
  theme,
  hasRewards = false,
  currentMudras,
  isPulsing = false,
  progressType = 'dots',
  selectedLanguage = 'en',
  onLanguageChange,
}) => {
  return (
    <YStack width="100%" gap={8} paddingHorizontal={12} paddingTop={8} paddingBottom={4}>
      {/* Top Action Row: Left-Aligned Back/Brand + Right-Aligned Controls (Language Globe & Mudras Vault) */}
      <XStack width="100%" justifyContent="space-between" alignItems="center" gap={8}>
        {/* Left: ← Back Button + Brand Crest */}
        <XStack alignItems="center" gap={8} flex={1} minWidth={0}>
          {canGoBack && onBack && (
            <SurveyBackButton onBack={onBack} theme={theme} />
          )}
          <SurveyBrandCrest
            brandName={brandName}
            optionalHeading={optionalHeading}
            theme={theme}
          />
        </XStack>

        {/* Right: Language Selector Globe + Mudras Vault Badge */}
        <XStack alignItems="center" gap={8}>
          {onLanguageChange && (
            <SurveyLanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={onLanguageChange}
              theme={theme}
              variant="compact"
            />
          )}
          {hasRewards && currentMudras !== undefined && (
            <SurveyMudrasBadge
              amount={currentMudras}
              theme={theme}
              isPulsing={isPulsing}
              variant="vault"
            />
          )}
        </XStack>
      </XStack>

      {/* Progress Chart: 'dots' (default) | 'percentage' | 'step' */}
      <SurveyTopProgressTracker
        progressType={progressType}
        totalMilestones={totalMilestones}
        currentMilestoneIndex={currentMilestoneIndex}
        completedMilestones={completedMilestones}
        theme={theme}
      />
    </YStack>
  );
};

// Also export as SurveyProgressHeader for standard naming
export const SurveyProgressHeader = DeepstashProgressHeader;
