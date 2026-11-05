import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles, LuCrown, LuHeart, LuGlobe } from 'react-icons/lu';
import { SurveyThemeTokens, getSurveyTheme } from './themeConfig';

export interface GenderOption {
  id: string;
  label: string;
  subtitle: string;
  iconType: 'women' | 'men' | 'couple' | 'neutral';
}

export interface TypeformGenderSelectionProps {
  questionNumber: number;
  title?: string;
  description?: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  theme?: SurveyThemeTokens;
}

export const GENDER_PERSONA_OPTIONS: GenderOption[] = [
  {
    id: 'women',
    label: "Women's Couture & Silks",
    subtitle: 'Heirloom Kanjeevarams, Banarasi drapes, bridal lehengas',
    iconType: 'women',
  },
  {
    id: 'men',
    label: "Men's Heritage Attire",
    subtitle: 'Pure silk dhotis, royal bandhgalas, raw silk kurtas',
    iconType: 'men',
  },
  {
    id: 'couple',
    label: 'Bridal Couple / Wedding Trousseau',
    subtitle: 'Coordinated bride & groom drapes for sacred muhurtham',
    iconType: 'couple',
  },
  {
    id: 'all_neutral',
    label: 'All Collections & Curations',
    subtitle: 'Exploring full handcrafted catalog & prestige gifting',
    iconType: 'neutral',
  },
];

export const TypeformGenderSelection: React.FC<TypeformGenderSelectionProps> = ({
  questionNumber,
  title = 'Which collection are you styling today?',
  description = 'Personalize your VIP discovery journey and tailor your 700 Mudras rewards.',
  selectedId,
  onSelect,
  theme,
}) => {
  const activeTheme = theme || getSurveyTheme('ivory-editorial');

  const getIcon = (type: GenderOption['iconType'], isSelected: boolean) => {
    const color = isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.kickerColor;
    switch (type) {
      case 'women':
        return <LuSparkles size={20} color={color} />;
      case 'men':
        return <LuCrown size={20} color={color} />;
      case 'couple':
        return <LuHeart size={20} color={color} />;
      case 'neutral':
        return <LuGlobe size={20} color={color} />;
    }
  };

  return (
    <YStack width="100%" maxWidth={680} gap={24} marginHorizontal="auto">
      {/* Header */}
      <YStack gap={8}>
        <XStack alignItems="center" gap={8}>
          <Text color={activeTheme.kickerColor} fontSize={13} fontWeight="700" letterSpacing={1}>
            {questionNumber} ➔
          </Text>
          <Text color={activeTheme.textMuted} fontSize={12} letterSpacing={1} textTransform="uppercase">
            Wardrobe Curation
          </Text>
        </XStack>

        <Text color={activeTheme.textHeading} fontSize={26} fontWeight="700" lineHeight={34}>
          {title}
        </Text>

        {description && (
          <Text color={activeTheme.textBody} fontSize={14} lineHeight={20}>
            {description}
          </Text>
        )}
      </YStack>

      {/* 2x2 or Stack of Cards */}
      <YStack gap={12}>
        {GENDER_PERSONA_OPTIONS.map((opt, idx) => {
          const isSelected = selectedId === opt.id;

          return (
            <XStack
              key={opt.id}
              cursor="pointer"
              backgroundColor={isSelected ? activeTheme.surfaceSelectedBg : activeTheme.surfaceColor}
              borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
              borderWidth={isSelected ? 1.5 : 1}
              borderRadius={12}
              paddingHorizontal={18}
              paddingVertical={16}
              justifyContent="space-between"
              alignItems="center"
              hoverStyle={{
                borderColor: activeTheme.surfaceHoverBorder,
                backgroundColor: isSelected ? activeTheme.surfaceSelectedBg : activeTheme.surfaceColor,
                transform: [{ translateX: 4 }],
              }}
              pressStyle={{
                transform: [{ scale: 0.99 }],
              }}
              onPress={() => onSelect(opt.id)}
              style={{
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: isSelected ? '0 4px 18px rgba(200, 90, 50, 0.16)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Left: Icon, Number Keycap & Details */}
              <XStack alignItems="center" gap={16} flex={1}>
                {/* Numeric keycap [1-4] */}
                <XStack
                  width={26}
                  height={26}
                  borderRadius={4}
                  backgroundColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.secondaryButtonBg}
                  borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
                  borderWidth={1}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text
                    color={isSelected ? '#FFFFFF' : activeTheme.textHeading}
                    fontSize={12}
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {idx + 1}
                  </Text>
                </XStack>

                {/* Persona Icon */}
                <XStack
                  width={38}
                  height={38}
                  borderRadius={19}
                  backgroundColor={isSelected ? activeTheme.accentBadgeBg : activeTheme.secondaryButtonBg}
                  justifyContent="center"
                  alignItems="center"
                >
                  {getIcon(opt.iconType, isSelected)}
                </XStack>

                <YStack gap={2} flex={1}>
                  <Text
                    color={activeTheme.textHeading}
                    fontSize={16}
                    fontWeight="700"
                  >
                    {opt.label}
                  </Text>
                  <Text color={activeTheme.textMuted} fontSize={12} lineHeight={16}>
                    {opt.subtitle}
                  </Text>
                </YStack>
              </XStack>

              {/* Right: Check Circle */}
              <XStack
                width={22}
                height={22}
                borderRadius={11}
                backgroundColor={isSelected ? activeTheme.surfaceSelectedBorder : 'transparent'}
                borderColor={isSelected ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
                borderWidth={1.5}
                justifyContent="center"
                alignItems="center"
              >
                {isSelected && <LuCheck size={14} color="#FFFFFF" />}
              </XStack>
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
};
