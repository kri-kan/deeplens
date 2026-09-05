import React from 'react';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
  className?: string;
}

export const LuPencil: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="edit-2" size={size} color={color} style={style} />
);
export const LuPlus: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="plus" size={size} color={color} style={style} />
);
export const LuMapPin: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="map-pin" size={size} color={color} style={style} />
);
export const LuX: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="x" size={size} color={color} style={style} />
);
export const LuSparkles: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Ionicons name="sparkles" size={size} color={color} style={style} />
);
export const LuClipboardPaste: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="clipboard-arrow-down-outline" size={size} color={color} style={style} />
);
export const LuClipboard: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="clipboard-text-outline" size={size} color={color} style={style} />
);
export const LuArrowLeft: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="arrow-left" size={size} color={color} style={style} />
);
export const LuCheck: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="check" size={size} color={color} style={style} />
);
export const LuTriangleAlert: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="alert-triangle" size={size} color={color} style={style} />
);
export const LuPhone: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="phone" size={size} color={color} style={style} />
);
export const LuExternalLink: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="external-link" size={size} color={color} style={style} />
);
export const LuTrash2: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="trash-2" size={size} color={color} style={style} />
);
export const LuChevronDown: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="chevron-down" size={size} color={color} style={style} />
);
export const LuChevronRight: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="chevron-right" size={size} color={color} style={style} />
);
export const LuImage: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="image" size={size} color={color} style={style} />
);
export const LuBuilding2: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="office-building" size={size} color={color} style={style} />
);
export const LuReceipt: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="receipt" size={size} color={color} style={style} />
);
export const LuInfo: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="info" size={size} color={color} style={style} />
);
