import React from 'react';
import { YStack } from 'tamagui';
import {
  SurveyOptionTile,
  TileAspectRatio,
  TileMediaConfig,
} from '../../molecules/SurveyOptionTile';
import { SurveyThemeTokens } from '../TypeformSurvey/themeConfig';
import { useResponsive } from '../../../theme';

export interface SurveyTileItem {
  id: string;
  title?: string;
  subtitle?: string;
  media?: TileMediaConfig;
  tileBgColor?: string;
  tileBorderColor?: string;
  tileSelectedBgColor?: string;
  tileSelectedBorderColor?: string;
}

export interface SurveyTileGridProps {
  tiles: SurveyTileItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isMultiSelect?: boolean;
  columns?: 2 | 3 | 4 | 5 | 'auto';
  aspectRatio?: TileAspectRatio | string;
  theme: SurveyThemeTokens;
  maxWidth?: number | string;
}

export const SurveyTileGrid: React.FC<SurveyTileGridProps> = ({
  tiles,
  selectedIds,
  onToggle,
  isMultiSelect = true,
  columns = 'auto',
  aspectRatio = '1:1',
  theme,
  maxWidth,
}) => {
  const responsive = useResponsive();
  const effectiveColumns =
    columns && columns !== 'auto'
      ? columns
      : responsive.isDesktop
      ? 5
      : responsive.isTablet
      ? 4
      : 3;

  const gap = effectiveColumns >= 5 ? 10 : effectiveColumns === 4 ? 8 : 6;

  return (
    <YStack
      width="100%"
      maxWidth={maxWidth}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
        gap,
        width: '100%',
        justifyContent: 'center',
      }}
    >
      {tiles.map((tile) => (
        <SurveyOptionTile
          key={tile.id}
          id={tile.id}
          title={tile.title}
          subtitle={tile.subtitle}
          media={tile.media}
          isSelected={selectedIds.includes(tile.id)}
          isMultiSelect={isMultiSelect}
          onToggle={onToggle}
          theme={theme}
          aspectRatio={aspectRatio}
          tileBgColor={tile.tileBgColor}
          tileBorderColor={tile.tileBorderColor}
          tileSelectedBgColor={tile.tileSelectedBgColor}
          tileSelectedBorderColor={tile.tileSelectedBorderColor}
          width="100%"
        />
      ))}
    </YStack>
  );
};
