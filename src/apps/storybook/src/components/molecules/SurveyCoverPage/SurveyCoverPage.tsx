import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuClock, LuClipboardList, LuLock, LuChevronRight } from 'react-icons/lu';
import { MudraCoin } from '../../atoms/MudraCoin';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';
import { SurveyBrandCrest } from '../SurveyBrandCrest';
import { SurveyLanguageSelector, SurveyLanguageOption, FAMILIAR_SURVEY_LANGUAGES } from '../SurveyLanguageSelector';

export type { SurveyLanguageOption };
export type SurveyCoverLanguageOption = SurveyLanguageOption;
export { FAMILIAR_SURVEY_LANGUAGES };

export interface SurveyCoverPageProps {
  brandName?: string;
  optionalHeading?: string;
  kicker?: string;
  title?: string;
  description?: string;
  languages?: SurveyLanguageOption[];
  selectedLanguage?: string;
  onLanguageChange?: (code: string) => void;
  estimatedDuration?: string;
  rewardMudras?: number;
  totalSteps?: number;
  startCtaLabel?: string;
  privacyText?: string;
  onStart: () => void;
  theme: SurveyThemeTokens;
  maxWidth?: number | string;
}

export const SurveyCoverPage: React.FC<SurveyCoverPageProps> = ({
  brandName = 'Vayyari',
  optionalHeading,
  kicker = 'CURATED TASTE DISCOVERY',
  title = 'Elevate Your Signature Silk Wardrobe',
  description = 'Tell us the weaves and heritage craftsmanship you adore. We’ll tailor your personal festive edits and private vault perks.',
  languages = FAMILIAR_SURVEY_LANGUAGES,
  selectedLanguage = 'en',
  onLanguageChange,
  estimatedDuration = '~90 Secs',
  rewardMudras = 700,
  totalSteps = 4,
  startCtaLabel = 'Start Discovery',
  privacyText = '100% Private. No spam ever.',
  onStart,
  theme,
  maxWidth = 440,
}) => {
  return (
    <YStack
      width="100%"
      maxWidth={maxWidth}
      flex={1}
      alignSelf="center"
      justifyContent="space-between"
      paddingHorizontal={20}
      paddingVertical={16}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header: Brand Crest & Top-Right Language Switcher (Globe Icon + Language Name + Popup) */}
      <XStack
        width="100%"
        alignItems="center"
        justifyContent="space-between"
        paddingBottom={16}
        borderBottomWidth={1}
        borderBottomColor={theme.surfaceBorder}
      >
        <SurveyBrandCrest
          brandName={brandName}
          optionalHeading={optionalHeading}
          theme={theme}
        />

        {/* Top-Right Globe Button */}
        <SurveyLanguageSelector
          selectedLanguage={selectedLanguage}
          onSelectLanguage={(code) => onLanguageChange?.(code)}
          languages={languages}
          theme={theme}
        />
      </XStack>

      {/* 2. Main Content Hero Briefing (Centered) */}
      <YStack
        alignItems="center"
        justifyContent="center"
        paddingVertical={28}
        gap={12}
        width="100%"
      >
        {/* Kicker Tag */}
        {kicker && (
          <Text
            fontSize={11}
            fontWeight="800"
            color={theme.kickerColor}
            letterSpacing={1.6}
            textTransform="uppercase"
            textAlign="center"
          >
            {kicker}
          </Text>
        )}

        {/* Survey Main Title */}
        <Text
          fontSize={24}
          fontWeight="800"
          color={theme.textHeading}
          lineHeight={30}
          textAlign="center"
          maxWidth={340}
        >
          {title}
        </Text>

        {/* Briefing Description */}
        {description && (
          <Text
            fontSize={13.5}
            fontWeight="500"
            color={theme.textMuted}
            lineHeight={20}
            textAlign="center"
            maxWidth={320}
          >
            {description}
          </Text>
        )}

        {/* 3. Stat Briefing Chips (Duration, Mudras Reward, Steps) */}
        <XStack
          gap={10}
          width="100%"
          justifyContent="center"
          marginTop={14}
          marginBottom={6}
        >
          {/* Chip 1: Duration */}
          <YStack
            flex={1}
            backgroundColor={theme.surfaceColor}
            borderColor={theme.surfaceBorder}
            borderWidth={1}
            borderRadius={14}
            paddingVertical={12}
            paddingHorizontal={6}
            alignItems="center"
            justifyContent="center"
            gap={3}
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <LuClock size={18} color={theme.textHeading} />
            <Text
              fontSize={12}
              fontWeight="800"
              color={theme.textHeading}
              numberOfLines={1}
            >
              {estimatedDuration}
            </Text>
            <Text
              fontSize={9.5}
              fontWeight="600"
              color={theme.textMuted}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              Duration
            </Text>
          </YStack>

          {/* Chip 2: Mudras Reward (Highlight Vault Card) */}
          <YStack
            flex={1}
            backgroundColor={theme.surfaceSelectedBg}
            borderColor={theme.kickerColor}
            borderWidth={1.5}
            borderRadius={14}
            paddingVertical={12}
            paddingHorizontal={6}
            alignItems="center"
            justifyContent="center"
            gap={3}
            style={{
              boxShadow: `0 4px 14px ${theme.kickerColor.startsWith('#') ? `${theme.kickerColor}25` : theme.kickerColor}`,
            }}
          >
            <MudraCoin size={20} isPulsing={true} />
            <Text
              fontSize={12}
              fontWeight="800"
              color={theme.kickerColor}
              numberOfLines={1}
            >
              +{rewardMudras} Mudras
            </Text>
            <Text
              fontSize={9.5}
              fontWeight="700"
              color={theme.kickerColor}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              Rewards
            </Text>
          </YStack>

          {/* Chip 3: Step Count */}
          <YStack
            flex={1}
            backgroundColor={theme.surfaceColor}
            borderColor={theme.surfaceBorder}
            borderWidth={1}
            borderRadius={14}
            paddingVertical={12}
            paddingHorizontal={6}
            alignItems="center"
            justifyContent="center"
            gap={3}
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <LuClipboardList size={18} color={theme.textHeading} />
            <Text
              fontSize={12}
              fontWeight="800"
              color={theme.textHeading}
              numberOfLines={1}
            >
              {totalSteps} Steps
            </Text>
            <Text
              fontSize={9.5}
              fontWeight="600"
              color={theme.textMuted}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              Quick Qs
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* 4. Action Area: Primary CTA & Privacy Notice */}
      <YStack width="100%" alignItems="center" gap={10} paddingTop={8} paddingBottom={4}>
        <XStack
          role="button"
          width="100%"
          backgroundColor={theme.primaryButtonBg}
          borderRadius={14}
          paddingVertical={15}
          paddingHorizontal={20}
          alignItems="center"
          justifyContent="center"
          gap={8}
          cursor="pointer"
          onPress={onStart}
          hoverStyle={{
            opacity: 0.94,
            transform: [{ translateY: -1 }],
          }}
          pressStyle={{
            transform: [{ scale: 0.98 }],
          }}
          style={{
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.18s ease',
          }}
        >
          <Text
            color={theme.primaryButtonText}
            fontSize={15}
            fontWeight="800"
            letterSpacing={0.4}
            style={{ userSelect: 'none' }}
          >
            {startCtaLabel}
          </Text>
          <LuChevronRight size={18} color={theme.primaryButtonText} strokeWidth={2.5} />
        </XStack>

        {/* Privacy Assurance */}
        {privacyText && (
          <XStack alignItems="center" gap={5} justifyContent="center">
            <LuLock size={12} color={theme.textMuted} />
            <Text fontSize={11} fontWeight="600" color={theme.textMuted}>
              {privacyText}
            </Text>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
};
