import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ColourCard } from '../../molecules/ColourCard/ColourCard';
import {
  CustomSwatchDot,
  SwatchTemplateType,
} from '../../atoms/SwatchDot/CustomSwatchDot';
import { useTheme } from '../../../theme';

export type ColourOption = {
  key: string;
  label: string;
  gradient?: [string, string];
  template?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  colors?: string[];
  colorCount?: 2 | 3 | 4;
  group?: 'warm' | 'cool' | 'neutral' | 'ethnic';
  subtitle?: string;
};

export type ColourSelectorProps = {
  options: ColourOption[];
  selected: string;
  onSelect: (key: string) => void;
  format?: 'cards' | 'dots';
  showCardLabel?: boolean;
};

export function ColourSelector({
  options,
  selected,
  onSelect,
  format = 'cards',
  showCardLabel = false,
}: ColourSelectorProps) {
  const { tokens } = useTheme();

  const activeOption = options.find((o) => o.key === selected) || options[0];
  const activeLabel = activeOption?.label ?? selected;

  const getTemplateLabel = (template?: SwatchTemplateType) => {
    switch (template) {
      case 'contrast-border':
        return 'Contrast Border';
      case 'multi-tone':
      case 'dual-tone':
        return 'Multi-Tone (Dhup-Chhaon)';
      case 'multi-shade':
      case 'half-and-half':
        return 'Multi-Shade';
      case 'multicolor':
        return 'Multicolor Grid';
      case 'solid':
      default:
        return 'Pure Solid';
    }
  };

  return (
    <YStack gap={12} alignSelf="flex-start" width="100%">
      {/* Active Color Info Header */}
      <XStack alignItems="center" justifyContent="space-between" width="100%">
        <XStack alignItems="baseline" gap={8} flexWrap="wrap">
          <Text fontSize={14} color={tokens.textSecondary} fontWeight="600">
            Colour:{' '}
            <Text color={tokens.text} fontWeight="800">
              {activeLabel}
            </Text>
          </Text>

          {activeOption?.template ? (
            <XStack
              backgroundColor={tokens.surfaceRaised}
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={6}
              borderWidth={1}
              borderColor={tokens.border}
            >
              <Text fontSize={10} fontWeight="800" color={tokens.accent} letterSpacing={0.4}>
                {getTemplateLabel(activeOption.template)}
              </Text>
            </XStack>
          ) : null}
        </XStack>

        <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
          {options.length} curated weaves
        </Text>
      </XStack>

      {/* Format 1: Rich Cards Scroll */}
      {format === 'cards' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ alignItems: 'flex-start', paddingVertical: 4 }}
        >
          <XStack alignItems="flex-start">
            {options.map((o) => (
              <ColourCard
                key={o.key}
                label={o.label}
                gradient={o.gradient}
                template={o.template}
                primaryColor={o.primaryColor}
                secondaryColor={o.secondaryColor}
                tertiaryColor={o.tertiaryColor}
                quaternaryColor={o.quaternaryColor}
                colors={o.colors}
                colorCount={o.colorCount}
                selected={selected === o.key}
                showLabel={showCardLabel}
                onPress={() => onSelect(o.key)}
              />
            ))}
          </XStack>
        </ScrollView>
      ) : (
        /* Format 2: Compact Swatch Dots Row */
        <XStack flexWrap="wrap" gap={12} alignItems="center" paddingVertical={4}>
          {options.map((o) => (
            <CustomSwatchDot
              key={o.key}
              template={o.template}
              primaryColor={o.primaryColor || (o.gradient ? o.gradient[0] : '#f3e6d8')}
              secondaryColor={o.secondaryColor || (o.gradient ? o.gradient[1] : '#d3aa75')}
              tertiaryColor={o.tertiaryColor}
              quaternaryColor={o.quaternaryColor}
              colors={o.colors}
              colorCount={o.colorCount}
              size={36}
              selected={selected === o.key}
              onPress={() => onSelect(o.key)}
            />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
