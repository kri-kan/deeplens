import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface CurationHubMetric {
  id?: string;
  icon?: React.ReactNode;
  label: string | number;
  color?: string;
  fontWeight?: '500' | '600' | '700' | '800' | '900';
  fontSize?: number;
}

export interface CurationHubTileProps {
  /** Main tile title */
  title: string;
  /** Primary icon component rendered in the icon wrapper */
  icon: React.ReactNode;
  /** Background color for icon wrapper */
  iconBg?: string;
  /** Metric items separated by inline pipe characters */
  metrics?: CurationHubMetric[];
  /** Custom slot for metrics row if structured metrics aren't sufficient */
  metricsSlot?: React.ReactNode;
  /** Action when tile is pressed */
  onPress?: () => void;
  /** Whether the tile is in active/selected state */
  isSelected?: boolean;
  /** Whether to show chevron on right of title */
  showChevron?: boolean;
  /** Minimum height constraint */
  minHeight?: number;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}
