import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { SurveyThemeTokens } from './themeConfig';

export interface OptionTileItem {
  id: string;
  label: string;
  emoji?: string;
  subtitle?: string;
}

export interface OptionTileGridProps {
  options: OptionTileItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isMultiSelect?: boolean;
  columns?: 2 | 3;
  theme: SurveyThemeTokens;
}

export const OptionTileGrid: React.FC<OptionTileGridProps> = ({
  options,
  selectedIds,
  onToggle,
  isMultiSelect = true,
  columns = 3,
  theme,
}) => {
  return (
    <YStack
      width="100%"
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 3 ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
        gap: 6,
        width: '100%',
      }}
    >
      {options.map((item) => {
        const isSelected = selectedIds.includes(item.id);

        return (
          <YStack
            key={item.id}
            cursor="pointer"
            width="100%"
            minWidth={0}
            minHeight={84}
            backgroundColor={isSelected ? theme.surfaceSelectedBg : theme.surfaceColor}
            borderColor={isSelected ? theme.surfaceSelectedBorder : theme.surfaceBorder}
            borderWidth={isSelected ? 2 : 1}
            borderRadius={16}
            paddingVertical={12}
            paddingHorizontal={8}
            justifyContent="center"
            alignItems="center"
            gap={6}
            position="relative"
            hoverStyle={{
              borderColor: theme.surfaceHoverBorder,
              transform: [{ translateY: -2 }],
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)',
            }}
            pressStyle={{
              transform: [{ scale: 0.97 }],
            }}
            onPress={() => onToggle(item.id)}
            style={{
              transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: isSelected
                ? `0 4px 16px ${theme.surfaceSelectedBorder}40`
                : '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Top-right subtle checkmark for multi-select */}
            {isMultiSelect && isSelected && (
              <XStack
                position="absolute"
                top={6}
                right={6}
                width={16}
                height={16}
                borderRadius={8}
                backgroundColor={theme.surfaceSelectedBorder}
                justifyContent="center"
                alignItems="center"
              >
                <LuCheck size={10} color="#ffffff" strokeWidth={3} />
              </XStack>
            )}

            {/* Emoji or Icon */}
            {item.emoji && (
              <Text fontSize={24} lineHeight={28} textAlign="center">
                {item.emoji}
              </Text>
            )}

            {/* Label */}
            <Text
              color={isSelected ? theme.textHeading : theme.textBody}
              fontSize={13}
              fontWeight={isSelected ? '700' : '600'}
              textAlign="center"
              lineHeight={16}
            >
              {item.label}
            </Text>

            {item.subtitle && (
              <Text
                color={theme.textMuted}
                fontSize={10}
                textAlign="center"
                lineHeight={12}
              >
                {item.subtitle}
              </Text>
            )}
          </YStack>
        );
      })}
    </YStack>
  );
};
