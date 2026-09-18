import React from 'react';
import { YStack, XStack } from 'tamagui';
import Svg, { Path, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

import {
  SwatchTemplateType,
  StandardColorName,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  STATIC_MULTICOLOR_PALETTE,
  resolveColorHex,
} from '@/constants/palette';

export {
  SwatchTemplateType,
  StandardColorName,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  STATIC_MULTICOLOR_PALETTE,
  resolveColorHex,
};

export type CustomSwatchDotProps = {
  template?: SwatchTemplateType;
  primaryColor: string; // Hex or StandardColorName
  secondaryColor?: string; // For contrast border, multi-tone, multi-shade
  tertiaryColor?: string; // For 3-shade, 3-tone, or multicolor
  quaternaryColor?: string; // For 4-shade, 4-tone, or multicolor
  colors?: string[]; // Array of 2 to 9 colors for multi-tone, multi-shade, or multicolor grid
  colorCount?: 2 | 3 | 4; // Number of colors for multi-shade (2 to 4 split stripes) or multi-tone (2 to 4 tone gradient)
  size?: number;
  shape?: 'circle' | 'square';
  selected?: boolean;
  onPress?: () => void;
};

export const CustomSwatchDot = React.memo(function CustomSwatchDot({
  template = 'solid',
  primaryColor,
  secondaryColor = '#D4AF37', // Default gold
  tertiaryColor = '#2E7D32', // Default green
  quaternaryColor = '#1565C0', // Default blue
  colors,
  colorCount,
  size = 32,
  shape = 'circle',
  selected = false,
  onPress,
}: CustomSwatchDotProps) {
  const { tokens } = useTheme();

  const c1 = resolveColorHex(primaryColor);
  const c2 = resolveColorHex(secondaryColor);
  const c3 = resolveColorHex(tertiaryColor);
  const c4 = resolveColorHex(quaternaryColor);

  const borderRadius = shape === 'circle' ? 9999 : Math.max(6, Math.floor(size / 4));

  // Determine colors for multi-shade (2 to 4 split stripes)
  const effectiveShadeCount = colorCount || (colors && colors.length >= 2 ? Math.min(colors.length, 4) : (tertiaryColor && quaternaryColor ? 4 : tertiaryColor ? 3 : 2));
  const multiShadeColors = (colors && colors.length >= 2)
    ? colors.slice(0, effectiveShadeCount).map(resolveColorHex)
    : [c1, c2, c3, c4].slice(0, effectiveShadeCount);

  // Determine colors for multi-tone (2 to 4 gradient stops)
  const effectiveToneCount = colorCount || (colors && colors.length >= 2 ? Math.min(colors.length, 4) : (tertiaryColor && quaternaryColor ? 4 : tertiaryColor ? 3 : 2));
  const multiToneColors = (colors && colors.length >= 2)
    ? colors.slice(0, Math.max(2, effectiveToneCount)).map(resolveColorHex)
    : [c1, c2, c3, c4].slice(0, Math.max(2, effectiveToneCount));

  // Render internal pattern according to swatch template
  const renderSwatchPattern = () => {
    switch (template) {
      case 'contrast-border':
        // Top 80% is body color, bottom 20% is solid border color
        return (
          <YStack width="100%" height="100%" overflow="hidden">
            <YStack flex={0.8} backgroundColor={c1} />
            <YStack
              flex={0.2}
              backgroundColor={c2}
              borderTopWidth={1}
              borderTopColor="rgba(255,255,255,0.25)"
            />
          </YStack>
        );

      case 'multi-tone':
      case 'dual-tone': {
        // Multi-tone gradient: dynamic color stop transitions for 2, 3, or 4 colors via native SVG
        const gradId = `grad-${c1.replace(/[^a-zA-Z0-9]/g, '')}-${c2.replace(/[^a-zA-Z0-9]/g, '')}-${size}`;
        const toneLocations: number[] =
          multiToneColors.length === 2
            ? [0, 1]
            : multiToneColors.length === 3
            ? [0, 0.5, 1]
            : [0, 0.33, 0.66, 1];

        return (
          <YStack width="100%" height="100%" overflow="hidden">
            <Svg viewBox="0 0 100 100" width="100%" height="100%">
              <Defs>
                <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  {multiToneColors.map((col, idx) => (
                    <Stop
                      key={idx}
                      offset={`${Math.round(toneLocations[idx] * 100)}%`}
                      stopColor={col}
                    />
                  ))}
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} />
            </Svg>
          </YStack>
        );
      }

      case 'multi-shade':
      case 'half-and-half': {
        // Multi-shade geometries:
        // - 2 colors: 50/50 split down the middle
        // - 3 colors: 3-way pie structure (120-degree radial wedges meeting at center)
        // - 4 colors: "+" cross sectioning (2x2 quadrant cross)
        if (multiShadeColors.length === 3) {
          return (
            <YStack width="100%" height="100%" overflow="hidden">
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
            <YStack width="100%" height="100%" overflow="hidden">
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
          <XStack width="100%" height="100%" overflow="hidden">
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

      case 'multicolor':
        // 4x4 grid (16 micro-cells) with a static set of 16 distinct colors
        return (
          <YStack width="100%" height="100%" overflow="hidden">
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
        return <YStack width="100%" height="100%" backgroundColor={c1} />;
    }
  };

  return (
    <XStack
      width={size}
      height={size}
      borderRadius={borderRadius}
      overflow="hidden"
      pointerEvents={onPress ? 'auto' : 'none'}
      cursor={onPress ? 'pointer' : 'default'}
      onPress={onPress}
      alignItems="center"
      justifyContent="center"
      position="relative"
      /* Outer ring for selected state */
      borderWidth={selected ? 2.5 : 1}
      borderColor={selected ? tokens.accent : 'rgba(0,0,0,0.15)'}
      hoverStyle={onPress ? {
        scale: 1.1,
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
      } : undefined}
      pressStyle={onPress ? { scale: 0.94 } : undefined}
    >
      {renderSwatchPattern()}
    </XStack>
  );
});
