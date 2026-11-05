import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles } from 'react-icons/lu';
import { FabricSwatchItem, SurveyLanguage, SurveyUiState } from './types';
import { SurveyThemeTokens, getSurveyTheme } from './themeConfig';

export interface FabricSwatchCardProps {
  swatch: FabricSwatchItem;
  isSelected?: boolean;
  language: SurveyLanguage;
  uiState?: SurveyUiState;
  onSelect?: (id: string) => void;
  keyboardShortcut?: string;
  theme?: SurveyThemeTokens;
}

export const FabricSwatchCard: React.FC<FabricSwatchCardProps> = ({
  swatch,
  isSelected = false,
  language,
  uiState = 'rest',
  onSelect,
  keyboardShortcut,
  theme,
}) => {
  const activeTheme = theme || getSurveyTheme('ivory-editorial');
  const isSelectedActive = isSelected || uiState === 'active';
  const isDisabled = uiState === 'disabled';
  const isLoading = uiState === 'loading';
  const isError = uiState === 'error';
  const isFocused = uiState === 'focused';

  if (isLoading) {
    return (
      <YStack
        width="100%"
        minHeight={160}
        borderRadius={12}
        backgroundColor={activeTheme.surfaceColor}
        borderColor={activeTheme.surfaceBorder}
        borderWidth={1}
        padding={16}
        justifyContent="space-between"
        style={{
          animation: 'pulse 1.5s infinite',
        }}
      >
        <XStack justifyContent="space-between">
          <YStack width={60} height={20} backgroundColor={activeTheme.secondaryButtonBg} borderRadius={6} />
          <YStack width={24} height={24} backgroundColor={activeTheme.secondaryButtonBg} borderRadius={12} />
        </XStack>
        <YStack gap={8}>
          <YStack width="70%" height={18} backgroundColor={activeTheme.secondaryButtonBg} borderRadius={4} />
          <YStack width="90%" height={12} backgroundColor={activeTheme.secondaryButtonBg} borderRadius={4} />
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      opacity={isDisabled ? 0.45 : 1}
      width="100%"
      borderRadius={12}
      paddingHorizontal={14}
      paddingVertical={12}
      minHeight={125}
      justifyContent="space-between"
      backgroundColor={isSelectedActive ? activeTheme.surfaceSelectedBg : activeTheme.surfaceColor}
      borderColor={
        isError
          ? '#ef4444'
          : isSelectedActive || isFocused
          ? activeTheme.surfaceSelectedBorder
          : activeTheme.surfaceBorder
      }
      borderWidth={isSelectedActive || isFocused ? 2 : 1}
      position="relative"
      overflow="hidden"
      hoverStyle={
        !isDisabled
          ? {
              borderColor: activeTheme.surfaceHoverBorder,
              transform: [{ translateY: -2 }],
              boxShadow: '0 8px 30px rgba(200, 90, 50, 0.18)',
            }
          : {}
      }
      pressStyle={
        !isDisabled
          ? {
              transform: [{ scale: 0.98 }],
            }
          : {}
      }
      onPress={() => {
        if (!isDisabled && onSelect) {
          onSelect(swatch.id);
        }
      }}
      style={{
        transition: 'all 0.25s ease',
        boxShadow: isSelectedActive
          ? '0 6px 24px rgba(200, 90, 50, 0.18)'
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Decorative Swatch Header Swatch Preview */}
      <YStack
        position="absolute"
        top={0}
        right={0}
        width={140}
        height={140}
        style={{
          background: swatch.gradient,
          opacity: isSelectedActive ? 0.35 : 0.18,
          borderRadius: '0 0 0 100px',
          pointerEvents: 'none',
        }}
      />

      {/* Top Row: Tag / Keyboard Shortcut & Checkmark Badge */}
      <XStack justifyContent="space-between" alignItems="center" zIndex={2}>
        <XStack alignItems="center" gap={8}>
          {keyboardShortcut && (
            <XStack
              backgroundColor={activeTheme.secondaryButtonBg}
              borderColor={activeTheme.surfaceBorder}
              borderWidth={1}
              borderRadius={4}
              width={22}
              height={22}
              justifyContent="center"
              alignItems="center"
            >
              <Text color={activeTheme.textHeading} fontSize={11} fontWeight="700">
                {keyboardShortcut}
              </Text>
            </XStack>
          )}

          <XStack
            backgroundColor={activeTheme.accentBadgeBg}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={4}
          >
            <Text color={activeTheme.accentBadgeText} fontSize={10} fontWeight="700" letterSpacing={0.5}>
              {swatch.tag.toUpperCase()}
            </Text>
          </XStack>
        </XStack>

        {/* Checkmark Circle */}
        <XStack
          width={24}
          height={24}
          borderRadius={12}
          backgroundColor={isSelectedActive ? activeTheme.surfaceSelectedBorder : 'transparent'}
          borderColor={isSelectedActive ? activeTheme.surfaceSelectedBorder : activeTheme.surfaceBorder}
          borderWidth={1}
          justifyContent="center"
          alignItems="center"
          style={{
            boxShadow: isSelectedActive ? '0 0 10px rgba(200, 90, 50, 0.3)' : 'none',
          }}
        >
          {isSelectedActive && <LuCheck size={14} color="#FFFFFF" />}
        </XStack>
      </XStack>

      {/* Middle & Bottom: Fabric Name, Subtitle & Origin */}
      <YStack zIndex={2} marginTop={8}>
        <XStack alignItems="center" gap={6} marginBottom={4}>
          <Text
            color={activeTheme.textHeading}
            fontSize={17}
            fontWeight="700"
            letterSpacing={0.4}
          >
            {swatch.title[language] || swatch.title.en}
          </Text>
          <LuSparkles size={13} color={activeTheme.kickerColor} />
        </XStack>

        <Text
          color={activeTheme.textMuted}
          fontSize={12}
          lineHeight={16}
          marginBottom={10}
        >
          {swatch.subtitle[language] || swatch.subtitle.en}
        </Text>

        <XStack justifyContent="space-between" alignItems="center">
          <Text color={activeTheme.kickerColor} fontSize={11} fontWeight="500">
            📍 {swatch.origin}
          </Text>
          <Text color={activeTheme.textMuted} fontSize={10} fontStyle="italic">
            {swatch.weaveTexture}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
};
