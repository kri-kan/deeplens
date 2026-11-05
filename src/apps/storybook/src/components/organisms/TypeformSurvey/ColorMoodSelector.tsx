import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { ColorMoodItem, SurveyLanguage, SurveyUiState } from './types';

export interface ColorMoodSelectorProps {
  moods: ColorMoodItem[];
  selectedId?: string;
  language: SurveyLanguage;
  uiState?: SurveyUiState;
  onSelect: (id: string) => void;
}

export const ColorMoodSelector: React.FC<ColorMoodSelectorProps> = ({
  moods,
  selectedId,
  language,
  uiState = 'rest',
  onSelect,
}) => {
  const isDisabled = uiState === 'disabled';

  return (
    <YStack width="100%" gap={14}>
      {moods.map((mood) => {
        const isSelected = selectedId === mood.id;

        return (
          <XStack
            key={mood.id}
            cursor={isDisabled ? 'not-allowed' : 'pointer'}
            opacity={isDisabled ? 0.45 : 1}
            backgroundColor="#14070a"
            borderColor={isSelected ? '#d4af37' : 'rgba(212, 175, 55, 0.25)'}
            borderWidth={isSelected ? 1.5 : 1}
            borderRadius={12}
            padding={16}
            justifyContent="space-between"
            alignItems="center"
            hoverStyle={
              !isDisabled
                ? {
                    borderColor: '#d4af37',
                    transform: [{ translateX: 4 }],
                  }
                : {}
            }
            pressStyle={
              !isDisabled
                ? {
                    transform: [{ scale: 0.99 }],
                  }
                : {}
            }
            onPress={() => {
              if (!isDisabled) {
                onSelect(mood.id);
              }
            }}
            style={{
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? '0 4px 20px rgba(212, 175, 55, 0.22)' : 'none',
            }}
          >
            {/* Left: Palette Chips & Description */}
            <YStack gap={6} flex={1} paddingRight={16}>
              <XStack alignItems="center" gap={10}>
                {/* 4 Swatch Circles */}
                <XStack gap={4}>
                  {mood.paletteColors.map((color, i) => (
                    <YStack
                      key={i}
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={color}
                      borderWidth={1}
                      borderColor="rgba(250, 238, 219, 0.2)"
                    />
                  ))}
                </XStack>

                <Text
                  color={isSelected ? '#ffd700' : '#faeedb'}
                  fontSize={16}
                  fontWeight="700"
                >
                  {mood.title[language] || mood.title.en}
                </Text>
              </XStack>

              <Text
                color="rgba(250, 238, 219, 0.65)"
                fontSize={12}
                lineHeight={16}
              >
                {mood.description[language] || mood.description.en}
              </Text>
            </YStack>

            {/* Right: Check Circle */}
            <XStack
              width={24}
              height={24}
              borderRadius={12}
              backgroundColor={isSelected ? '#d4af37' : 'rgba(250, 238, 219, 0.05)'}
              borderColor={isSelected ? '#ffd700' : 'rgba(212, 175, 55, 0.3)'}
              borderWidth={1}
              justifyContent="center"
              alignItems="center"
            >
              {isSelected && <LuCheck size={14} color="#0d0407" />}
            </XStack>
          </XStack>
        );
      })}
    </YStack>
  );
};
