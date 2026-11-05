import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export type TileImageFillMode = 'card-full' | 'top-banner' | 'thumbnail' | 'contain-fit';
export type TileAspectRatio = '1:1' | '3:4' | '4:3' | '9:16';

export function getTileAspectRatioCss(ratio: TileAspectRatio | string = '1:1'): string {
  switch (ratio) {
    case '1:1':
      return '1 / 1';
    case '3:4':
      return '3 / 4';
    case '4:3':
      return '4 / 3';
    case '9:16':
      return '9 / 16';
    default:
      return String(ratio);
  }
}

export interface TileMediaConfig {
  type: 'emoji' | 'image' | 'icon';

  // Emoji customization options
  emoji?: string;
  emojiColor?: string;
  emojiBgColor?: string;
  emojiBorderColor?: string;
  emojiSize?: number;

  // Icon customization
  icon?: React.ReactNode;

  // Image customization & area selection options
  imageUrl?: string;
  imageFillMode?: TileImageFillMode;
  imagePosition?: string;
  aspectRatio?: number;
}

export interface SurveyOptionTileProps {
  id: string;
  title?: string;
  subtitle?: string;
  media?: TileMediaConfig;

  // Selection & Mode
  isSelected?: boolean;
  isMultiSelect?: boolean;
  onToggle?: (id: string) => void;
  theme: SurveyThemeTokens;

  // Direct visual overrides
  tileBgColor?: string;
  tileBorderColor?: string;
  tileSelectedBgColor?: string;
  tileSelectedBorderColor?: string;

  // Sizing & Aspect Ratio
  width?: string | number;
  minHeight?: number;
  aspectRatio?: TileAspectRatio | string;
}

export const SurveyOptionTile: React.FC<SurveyOptionTileProps> = ({
  id,
  title,
  subtitle,
  media,
  isSelected = false,
  isMultiSelect = true,
  onToggle,
  theme,
  tileBgColor,
  tileBorderColor,
  tileSelectedBgColor,
  tileSelectedBorderColor,
  width = '100%',
  minHeight,
  aspectRatio = '1:1',
}) => {
  const isImageCardFull =
    media?.type === 'image' &&
    Boolean(media?.imageUrl) &&
    (media.imageFillMode === 'card-full' || !media.imageFillMode);

  const effectiveBg = isSelected
    ? tileSelectedBgColor || theme.surfaceSelectedBg
    : tileBgColor || theme.surfaceColor;

  const effectiveBorder = isSelected
    ? tileSelectedBorderColor || theme.surfaceSelectedBorder
    : tileBorderColor || theme.surfaceBorder;

  const isCompactLandscape = aspectRatio === '4:3';
  const isStoryTall = aspectRatio === '9:16';

  return (
    <YStack
      cursor="pointer"
      width={width}
      minWidth={0}
      maxWidth="100%"
      minHeight={minHeight}
      backgroundColor={isImageCardFull ? 'transparent' : effectiveBg}
      borderColor={effectiveBorder}
      borderWidth={isSelected ? 2 : 1}
      borderRadius={14}
      position="relative"
      overflow="hidden"
      justifyContent="space-between"
      alignItems="center"
      paddingVertical={0}
      paddingHorizontal={0}
      hoverStyle={{
        borderColor: theme.surfaceHoverBorder,
        transform: [{ translateY: -2 }],
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)',
      }}
      pressStyle={{ transform: [{ scale: 0.97 }] }}
      onPress={() => onToggle?.(id)}
      style={{
        aspectRatio: getTileAspectRatioCss(aspectRatio),
        transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
        boxShadow: isSelected
          ? `0 4px 16px ${effectiveBorder.startsWith('#') ? `${effectiveBorder}45` : effectiveBorder}`
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 1. Full Image Cover Mode */}
      {isImageCardFull && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0} zIndex={1}>
          <img
            src={media?.imageUrl}
            alt={title || ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: media?.imagePosition || 'center',
            }}
          />
        </YStack>
      )}

      {/* 2. Top-Right Selection Indicator (Checkmark for Multi-Select, Radio Dot for Single-Select) */}
      {isSelected && (
        <XStack
          position="absolute"
          top={6}
          right={6}
          zIndex={10}
          width={18}
          height={18}
          borderRadius={9}
          backgroundColor={isMultiSelect ? effectiveBorder : 'rgba(0,0,0,0.08)'}
          borderColor={effectiveBorder}
          borderWidth={isMultiSelect ? 0 : 2}
          justifyContent="center"
          alignItems="center"
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
        >
          {isMultiSelect ? (
            <LuCheck size={11} color="#ffffff" strokeWidth={3} />
          ) : (
            <XStack
              width={7}
              height={7}
              borderRadius={3.5}
              backgroundColor={effectiveBorder}
            />
          )}
        </XStack>
      )}

      {/* 3. Direct Icon / Emoji in button space (Single container design - NO nested boxes) */}
      {media?.type === 'icon' && media.icon && (
        <XStack
          flex={1}
          width="100%"
          minHeight={0}
          justifyContent="center"
          alignItems="center"
          zIndex={2}
          paddingTop={isCompactLandscape ? 4 : 8}
          paddingBottom={2}
        >
          {React.isValidElement(media.icon)
            ? React.cloneElement(media.icon as React.ReactElement<any>, {
                size:
                  (media.icon as React.ReactElement<any>).props?.size ||
                  (isStoryTall ? 44 : isCompactLandscape ? 26 : 36),
                color:
                  (media.icon as React.ReactElement<any>).props?.color ||
                  (isSelected ? theme.surfaceSelectedBorder : theme.textHeading),
                strokeWidth: 2,
              })
            : media.icon}
        </XStack>
      )}

      {media?.type === 'emoji' && media.emoji && (
        <XStack
          flex={1}
          width="100%"
          minHeight={0}
          justifyContent="center"
          alignItems="center"
          zIndex={2}
          paddingTop={isCompactLandscape ? 4 : 8}
          paddingBottom={2}
        >
          <Text
            fontSize={
              media.emojiSize ||
              (isStoryTall ? 46 : isCompactLandscape ? 26 : 36)
            }
            lineHeight={
              media.emojiSize
                ? media.emojiSize * 1.15
                : isStoryTall
                ? 50
                : isCompactLandscape
                ? 30
                : 40
            }
            color={media.emojiColor || undefined}
            textAlign="center"
            style={{ userSelect: 'none' }}
          >
            {media.emoji}
          </Text>
        </XStack>
      )}

      {/* 4. Text Labels: Title and Subtitle at Bottom (Overlays on image as background for image tile) */}
      <YStack
        width="100%"
        alignItems="center"
        justifyContent="flex-end"
        gap={1}
        zIndex={5}
        flexShrink={0}
        paddingHorizontal={isImageCardFull ? 6 : 3}
        paddingBottom={isImageCardFull ? (isCompactLandscape ? 5 : 8) : isCompactLandscape ? 4 : 6}
        paddingTop={isImageCardFull ? 16 : 0}
        style={
          isImageCardFull
            ? {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.88) 100%)',
              }
            : undefined
        }
      >
        {title && (
          <Text
            color={isImageCardFull ? '#ffffff' : isSelected ? theme.textHeading : theme.textBody}
            fontSize={isCompactLandscape ? 10.5 : 11.5}
            fontWeight={isSelected ? '800' : '600'}
            textAlign="center"
            lineHeight={isCompactLandscape ? 13 : 14}
            numberOfLines={isCompactLandscape ? 1 : 2}
            style={{
              textShadow: isImageCardFull ? '0 1px 4px rgba(0,0,0,0.9)' : 'none',
            }}
          >
            {title}
          </Text>
        )}

        {subtitle && (
          <Text
            color={isImageCardFull ? 'rgba(255, 255, 255, 0.88)' : theme.textMuted}
            fontSize={isCompactLandscape ? 8.5 : 9.5}
            textAlign="center"
            lineHeight={isCompactLandscape ? 10 : 12}
            numberOfLines={1}
            style={{
              textShadow: isImageCardFull ? '0 1px 3px rgba(0,0,0,0.9)' : 'none',
            }}
          >
            {subtitle}
          </Text>
        )}
      </YStack>
    </YStack>
  );
};
