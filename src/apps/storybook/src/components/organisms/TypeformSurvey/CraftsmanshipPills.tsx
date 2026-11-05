import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { CraftsmanshipItem, SurveyLanguage, SurveyUiState } from './types';

export interface CraftsmanshipPillsProps {
  options: CraftsmanshipItem[];
  selectedIds: string[];
  language: SurveyLanguage;
  uiState?: SurveyUiState;
  onToggle: (id: string) => void;
}

export const CraftsmanshipPills: React.FC<CraftsmanshipPillsProps> = ({
  options,
  selectedIds,
  language,
  uiState = 'rest',
  onToggle,
}) => {
  const isDisabled = uiState === 'disabled';

  return (
    <YStack width="100%" gap={12}>
      <XStack flexWrap="wrap" gap={10}>
        {options.map((item, idx) => {
          const isSelected = selectedIds.includes(item.id) || (uiState === 'active' && idx === 0);
          const isFocused = uiState === 'focused' && idx === 0;

          return (
            <XStack
              key={item.id}
              cursor={isDisabled ? 'not-allowed' : 'pointer'}
              opacity={isDisabled ? 0.45 : 1}
              backgroundColor={isSelected ? 'rgba(212, 175, 55, 0.18)' : '#18090e'}
              borderColor={
                isSelected || isFocused ? '#d4af37' : 'rgba(212, 175, 55, 0.28)'
              }
              borderWidth={isSelected || isFocused ? 1.5 : 1}
              borderRadius={24}
              paddingHorizontal={16}
              paddingVertical={10}
              alignItems="center"
              gap={10}
              hoverStyle={
                !isDisabled
                  ? {
                      borderColor: '#d4af37',
                      backgroundColor: 'rgba(212, 175, 55, 0.12)',
                      transform: [{ translateY: -1 }],
                    }
                  : {}
              }
              pressStyle={
                !isDisabled
                  ? {
                      transform: [{ scale: 0.97 }],
                    }
                  : {}
              }
              onPress={() => {
                if (!isDisabled) {
                  onToggle(item.id);
                }
              }}
              style={{
                transition: 'all 0.2s ease',
                boxShadow: isSelected
                  ? '0 2px 14px rgba(212, 175, 55, 0.25)'
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Checkmark or Index */}
              <XStack
                width={18}
                height={18}
                borderRadius={9}
                backgroundColor={isSelected ? '#d4af37' : 'rgba(250, 238, 219, 0.08)'}
                justifyContent="center"
                alignItems="center"
              >
                {isSelected ? (
                  <LuCheck size={12} color="#0d0407" />
                ) : (
                  <Text color="rgba(250, 238, 219, 0.4)" fontSize={10} fontWeight="600">
                    {idx + 1}
                  </Text>
                )}
              </XStack>

              <YStack>
                <Text
                  color={isSelected ? '#ffd700' : '#faeedb'}
                  fontSize={14}
                  fontWeight="600"
                >
                  {item.label[language] || item.label.en}
                </Text>
                <Text
                  color="rgba(250, 238, 219, 0.55)"
                  fontSize={11}
                  lineHeight={14}
                >
                  {item.subtitle[language] || item.subtitle.en}
                </Text>
              </YStack>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
};
