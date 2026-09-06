import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '../../../theme';
import {
  SwatchTemplateType,
  resolveColorHex,
  STATIC_MULTICOLOR_PALETTE,
} from '../../atoms/SwatchDot/CustomSwatchDot';

export type ColourCardProps = {
  label: string;
  gradient?: [string, string];
  template?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  colors?: string[];
  colorCount?: 2 | 3 | 4;
  selected?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
};

export function ColourCard({
  label,
  gradient,
  template,
  primaryColor,
  secondaryColor = '#D4AF37',
  tertiaryColor = '#2E7D32',
  quaternaryColor = '#1565C0',
  colors,
  colorCount,
  selected = false,
  showLabel = false,
  onPress,
}: ColourCardProps) {
  const { tokens } = useTheme();

  // If gradient provided without explicit template, treat as multi-tone
  const activeTemplate = template || (gradient ? 'multi-tone' : 'solid');
  const c1 = primaryColor ? resolveColorHex(primaryColor) : (gradient ? gradient[0] : '#f3e6d8');
  const c2 = secondaryColor ? resolveColorHex(secondaryColor) : (gradient ? gradient[1] : '#d3aa75');
  const c3 = resolveColorHex(tertiaryColor);
  const c4 = resolveColorHex(quaternaryColor);

  const cardH = showLabel ? 108 : 56;
  const swatchH = showLabel ? 72 : cardH;

  // Determine colors for multi-shade (2 to 4 vertical stripes)
  const effectiveShadeCount = colorCount || (colors && colors.length >= 2 ? Math.min(colors.length, 4) : (tertiaryColor && quaternaryColor ? 4 : tertiaryColor ? 3 : 2));
  const multiShadeColors = (colors && colors.length >= 2)
    ? colors.slice(0, effectiveShadeCount).map(resolveColorHex)
    : [c1, c2, c3, c4].slice(0, effectiveShadeCount);

  // Determine colors for multi-tone (2 to 4 gradient colors)
  const effectiveToneCount = colorCount || (colors && colors.length >= 2 ? Math.min(colors.length, 4) : (tertiaryColor && quaternaryColor ? 4 : tertiaryColor ? 3 : 2));
  const multiToneColors = (colors && colors.length >= 2)
    ? colors.slice(0, Math.max(2, effectiveToneCount)).map(resolveColorHex)
    : (gradient ? gradient : [c1, c2, c3, c4].slice(0, Math.max(2, effectiveToneCount)));

  const renderCardSwatch = () => {
    switch (activeTemplate) {
      case 'contrast-border':
        return (
          <YStack width="100%" height={swatchH} overflow="hidden">
            <YStack flex={0.8} backgroundColor={c1} />
            <YStack
              flex={0.2}
              backgroundColor={c2}
              borderTopWidth={1.5}
              borderTopColor="rgba(255,255,255,0.3)"
            />
          </YStack>
        );

      case 'multi-shade':
      case 'half-and-half': {
        // Multi-shade geometries:
        // - 2 colors: 50/50 vertical split
        // - 3 colors: 3-way pie structure (120-degree radial wedges meeting at center)
        // - 4 colors: "+" cross sectioning (2x2 quadrant cross)
        if (multiShadeColors.length === 3) {
          return (
            <YStack width="100%" height={swatchH} overflow="hidden">
              <Svg viewBox="0 0 100 100" width="100%" height="100%">
                {/* Wedge 1: Top-Right (120°) */}
                <Path
                  d="M 50 50 L 50 -30 A 80 80 0 0 1 119.28 90 Z"
                  fill={multiShadeColors[0]}
                />
                {/* Wedge 2: Bottom (120°) */}
                <Path
                  d="M 50 50 L 119.28 90 A 80 80 0 0 1 -19.28 90 Z"
                  fill={multiShadeColors[1]}
                />
                {/* Wedge 3: Top-Left (120°) */}
                <Path
                  d="M 50 50 L -19.28 90 A 80 80 0 0 1 50 -30 Z"
                  fill={multiShadeColors[2]}
                />
                {/* Hairline dividers radiating from center */}
                <Line x1="50" y1="50" x2="50" y2="-30" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                <Line x1="50" y1="50" x2="119.28" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                <Line x1="50" y1="50" x2="-19.28" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              </Svg>
            </YStack>
          );
        }

        if (multiShadeColors.length >= 4) {
          return (
            <YStack width="100%" height={swatchH} overflow="hidden">
              <XStack flex={1}>
                <XStack flex={1} backgroundColor={multiShadeColors[0]} />
                <XStack
                  flex={1}
                  backgroundColor={multiShadeColors[1]}
                  borderLeftWidth={1.5}
                  borderLeftColor="rgba(255,255,255,0.35)"
                />
              </XStack>
              <XStack flex={1} borderTopWidth={1.5} borderTopColor="rgba(255,255,255,0.35)">
                <XStack flex={1} backgroundColor={multiShadeColors[2]} />
                <XStack
                  flex={1}
                  backgroundColor={multiShadeColors[3]}
                  borderLeftWidth={1.5}
                  borderLeftColor="rgba(255,255,255,0.35)"
                />
              </XStack>
            </YStack>
          );
        }

        // Default 2 colors: 50/50 vertical split
        return (
          <XStack width="100%" height={swatchH} overflow="hidden">
            <XStack flex={1} backgroundColor={multiShadeColors[0]} />
            <XStack
              flex={1}
              backgroundColor={multiShadeColors[1]}
              borderLeftWidth={1.5}
              borderLeftColor="rgba(255,255,255,0.3)"
            />
          </XStack>
        );
      }

      case 'multi-tone':
      case 'dual-tone': {
        const toneLocations: [number, number, ...number[]] =
          multiToneColors.length === 2
            ? [0, 1]
            : multiToneColors.length === 3
            ? [0, 0.5, 1]
            : [0, 0.33, 0.66, 1];

        return (
          <LinearGradient
            colors={multiToneColors as [string, string, ...string[]]}
            locations={toneLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: swatchH }}
          />
        );
      }

      case 'multicolor':
        // 4x4 grid (16 micro-cells) with static set of 16 distinct colors
        return (
          <YStack width="100%" height={swatchH} overflow="hidden">
            {[0, 1, 2, 3].map((rowIndex) => (
              <XStack key={rowIndex} flex={1}>
                {[0, 1, 2, 3].map((colIndex) => {
                  const cellColor = STATIC_MULTICOLOR_PALETTE[rowIndex * 4 + colIndex];
                  return (
                    <XStack
                      key={colIndex}
                      flex={1}
                      backgroundColor={cellColor}
                      borderRightWidth={colIndex < 3 ? 0.5 : 0}
                      borderBottomWidth={rowIndex < 3 ? 0.5 : 0}
                      borderColor="rgba(255,255,255,0.25)"
                    />
                  );
                })}
              </XStack>
            ))}
          </YStack>
        );

      case 'solid':
      default:
        return <YStack width="100%" height={swatchH} backgroundColor={c1} />;
    }
  };

  const cardW = showLabel ? 78 : 56;
  const radius = showLabel ? 14 : 10;

  return (
    <YStack
      width={cardW}
      height={cardH}
      alignSelf="flex-start"
      flexShrink={0}
      marginRight={8}
      borderRadius={radius}
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? tokens.accent : tokens.border}
      backgroundColor={tokens.surface}
      overflow="hidden"
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        borderColor: tokens.accent,
        scale: 1.04,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
      }}
      pressStyle={{ scale: 0.95 }}
    >
      {renderCardSwatch()}
      {showLabel ? (
        <Text
          fontSize={11}
          fontWeight={selected ? '800' : '600'}
          color={selected ? tokens.accent : tokens.textSecondary}
          paddingVertical={6}
          paddingHorizontal={4}
          textAlign="center"
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </YStack>
  );
}
