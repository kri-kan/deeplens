import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuGlobe, LuChevronDown, LuCheck, LuX } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyLanguageOption {
  code: string;
  name: string;        // Native script label, e.g. 'తెలుగు'
  englishName: string; // English transliteration, e.g. 'Telugu'
  region?: string;     // Region info, e.g. 'ఆంధ్రప్రదేశ్ & తెలంగాణ'
}

export const FAMILIAR_SURVEY_LANGUAGES: SurveyLanguageOption[] = [
  { code: 'te', name: 'తెలుగు', englishName: 'Telugu', region: 'ఆంధ్రప్రదేశ్ & తెలంగాణ' },
  { code: 'hi', name: 'हिंदी', englishName: 'Hindi', region: 'उत्तर व मध्य भारत' },
  { code: 'en', name: 'English', englishName: 'English', region: 'Global Standard' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', region: 'தமிழ்நாடு' },
  { code: 'ml', name: 'മലയാളം', englishName: 'Malayalam', region: 'കേരളം' },
  { code: 'kn', name: 'ಕನ್ನಡ', englishName: 'Kannada', region: 'ಕರ್ನಾಟಕ' },
];

export interface SurveyLanguageSelectorProps {
  selectedLanguage?: string;
  onSelectLanguage: (code: string) => void;
  languages?: SurveyLanguageOption[];
  theme: SurveyThemeTokens;
  variant?: 'pill' | 'compact' | 'icon-only';
  dialogTitle?: string;
  dialogSubtitle?: string;
}

export const SurveyLanguageSelector: React.FC<SurveyLanguageSelectorProps> = ({
  selectedLanguage = 'en',
  onSelectLanguage,
  languages = FAMILIAR_SURVEY_LANGUAGES,
  theme,
  variant = 'pill',
  dialogTitle = 'Choose Survey Language',
  dialogSubtitle = 'Personalize your VIP survey experience',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeLang =
    languages.find((l) => l.code === selectedLanguage) ||
    languages.find((l) => l.code === 'en') ||
    languages[0];

  return (
    <>
      {/* 1. TOP-RIGHT GLOBE TRIGGER BUTTON */}
      <XStack
        role="button"
        cursor="pointer"
        alignItems="center"
        justifyContent="center"
        gap={6}
        paddingHorizontal={variant === 'compact' ? 8 : 10}
        paddingVertical={variant === 'compact' ? 4 : 6}
        borderRadius={20}
        backgroundColor={theme.surfaceColor}
        borderColor={theme.surfaceBorder}
        borderWidth={1}
        hoverStyle={{
          borderColor: theme.surfaceHoverBorder,
        }}
        pressStyle={{ transform: [{ scale: 0.95 }] }}
        onPress={() => setIsOpen(true)}
        style={{
          transition: 'all 0.16s ease',
          userSelect: 'none',
        }}
      >
        <LuGlobe size={15} color={theme.kickerColor || theme.textHeading} />
        {variant !== 'icon-only' && (
          <Text
            color={theme.textHeading}
            fontSize={12}
            fontWeight="700"
            letterSpacing={0.2}
          >
            {activeLang.name}
          </Text>
        )}
        <LuChevronDown size={12} color={theme.textMuted} />
      </XStack>

      {/* 2. POPUP MODAL DIALOG (6 FAMILIAR INDIAN LANGUAGES) */}
      {isOpen && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={99999}
          alignItems="center"
          justifyContent="center"
          padding={16}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.62)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onPress={() => setIsOpen(false)}
        >
          <YStack
            width="100%"
            maxWidth={370}
            backgroundColor={theme.backgroundColor}
            borderRadius={22}
            borderColor={theme.surfaceBorder}
            borderWidth={1.5}
            padding={20}
            gap={14}
            onPress={(e) => {
              // Prevent clicks inside popup card from closing the modal
              e.stopPropagation();
            }}
            style={{
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={10}>
                <XStack
                  width={34}
                  height={34}
                  borderRadius={17}
                  backgroundColor={theme.surfaceSelectedBg}
                  borderColor={theme.surfaceSelectedBorder}
                  borderWidth={1}
                  justifyContent="center"
                  alignItems="center"
                >
                  <LuGlobe size={18} color={theme.kickerColor} />
                </XStack>
                <YStack gap={2}>
                  <Text color={theme.textHeading} fontSize={16} fontWeight="800">
                    {dialogTitle}
                  </Text>
                  <Text color={theme.textMuted} fontSize={11}>
                    {dialogSubtitle}
                  </Text>
                </YStack>
              </XStack>

              {/* Close Button */}
              <XStack
                role="button"
                cursor="pointer"
                width={28}
                height={28}
                borderRadius={14}
                backgroundColor={theme.surfaceColor}
                borderColor={theme.surfaceBorder}
                borderWidth={1}
                alignItems="center"
                justifyContent="center"
                hoverStyle={{ borderColor: theme.surfaceHoverBorder }}
                onPress={() => setIsOpen(false)}
              >
                <LuX size={15} color={theme.textMuted} />
              </XStack>
            </XStack>

            {/* Separator */}
            <YStack height={1} backgroundColor={theme.surfaceBorder} width="100%" />

            {/* Languages List: Telugu, Hindi, English, Tamil, Malayalam, Kannada */}
            <YStack gap={8}>
              {languages.map((lang) => {
                const isSelected = lang.code === activeLang.code;
                return (
                  <XStack
                    key={lang.code}
                    role="button"
                    cursor="pointer"
                    paddingHorizontal={14}
                    paddingVertical={11}
                    borderRadius={12}
                    backgroundColor={isSelected ? theme.surfaceSelectedBg : theme.surfaceColor}
                    borderColor={isSelected ? theme.surfaceSelectedBorder : theme.surfaceBorder}
                    borderWidth={isSelected ? 1.5 : 1}
                    justifyContent="space-between"
                    alignItems="center"
                    hoverStyle={{
                      borderColor: theme.surfaceHoverBorder,
                    }}
                    pressStyle={{ transform: [{ scale: 0.98 }] }}
                    onPress={() => {
                      onSelectLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    style={{
                      transition: 'all 0.14s ease',
                    }}
                  >
                    <YStack gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <Text
                          fontSize={15}
                          fontWeight={isSelected ? '800' : '600'}
                          color={theme.textHeading}
                        >
                          {lang.name}
                        </Text>
                        <Text fontSize={12} color={theme.textMuted}>
                          ({lang.englishName})
                        </Text>
                      </XStack>
                      {lang.region && (
                        <Text fontSize={11} color={theme.textMuted} opacity={0.8}>
                          {lang.region}
                        </Text>
                      )}
                    </YStack>

                    {/* Indicator: Checkmark when selected, subtle radio ring when unselected */}
                    <XStack
                      width={22}
                      height={22}
                      borderRadius={11}
                      backgroundColor={isSelected ? theme.primaryButtonBg : 'transparent'}
                      borderColor={isSelected ? theme.primaryButtonBg : theme.surfaceBorder}
                      borderWidth={isSelected ? 0 : 1.5}
                      justifyContent="center"
                      alignItems="center"
                      style={{
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {isSelected && (
                        <LuCheck size={13} color={theme.primaryButtonText} strokeWidth={3} />
                      )}
                    </XStack>
                  </XStack>
                );
              })}
            </YStack>
          </YStack>
        </YStack>
      )}
    </>
  );
};
