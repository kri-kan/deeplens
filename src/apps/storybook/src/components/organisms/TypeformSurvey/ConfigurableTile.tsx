import React from 'react';
import {
  SurveyOptionTile,
  SurveyOptionTileProps,
  TileMediaConfig,
  TileAspectRatio,
  TileImageFillMode,
  getTileAspectRatioCss,
} from '../../molecules/SurveyOptionTile';

export type {
  TileMediaConfig,
  TileAspectRatio,
  TileImageFillMode,
};

export { getTileAspectRatioCss };

export type ConfigurableTileProps = SurveyOptionTileProps;

export const ConfigurableTile: React.FC<ConfigurableTileProps> = (props) => {
  return <SurveyOptionTile {...props} />;
};
