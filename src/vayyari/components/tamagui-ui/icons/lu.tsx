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
export const LuCopy: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="copy" size={size} color={color} style={style} />
);
export const LuTag: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="tag" size={size} color={color} style={style} />
);
export const LuSettings: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="settings" size={size} color={color} style={style} />
);
export const LuRefreshCw: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="refresh-cw" size={size} color={color} style={style} />
);
export const LuHistory: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="history" size={size} color={color} style={style} />
);
export const LuInbox: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="inbox" size={size} color={color} style={style} />
);
export const LuSearch: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="search" size={size} color={color} style={style} />
);
export const LuClock: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="clock" size={size} color={color} style={style} />
);
export const LuPackage: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="package" size={size} color={color} style={style} />
);
export const LuTruck: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <MaterialCommunityIcons name="truck-delivery-outline" size={size} color={color} style={style} />
);
export const LuUser: React.FC<IconProps> = ({ size = 16, color = '#333333', style }) => (
  <Feather name="user" size={size} color={color} style={style} />
);

export const LuUsers: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="users" size={size} color={color} style={style} />
);
export const LuLayers: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="layers" size={size} color={color} style={style} />
);
export const LuList: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="list" size={size} color={color} style={style} />
);
export const LuDatabase: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <MaterialCommunityIcons name="database-outline" size={size} color={color} style={style} />
);
export const LuMonitor: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="monitor" size={size} color={color} style={style} />
);
export const LuYoutube: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="youtube" size={size} color={color} style={style} />
);
export const LuLink: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="link" size={size} color={color} style={style} />
);
export const LuFlaskConical: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <MaterialCommunityIcons name="flask-outline" size={size} color={color} style={style} />
);
export const LuMegaphone: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <MaterialCommunityIcons name="bullhorn-outline" size={size} color={color} style={style} />
);
export const LuShield: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="shield" size={size} color={color} style={style} />
);
export const LuHash: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="hash" size={size} color={color} style={style} />
);
export const LuLayoutDashboard: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="layout" size={size} color={color} style={style} />
);

export const LuStar: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Ionicons name="star" size={size} color={color} style={style} />
);
export const LuSlidersHorizontal: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="sliders" size={size} color={color} style={style} />
);
export const LuArchive: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="archive" size={size} color={color} style={style} />
);
export const LuRotateCcw: React.FC<IconProps> = ({ size = 16, color = "#333333", style }) => (
  <Feather name="rotate-ccw" size={size} color={color} style={style} />
);
