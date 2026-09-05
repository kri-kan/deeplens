import React from 'react';
import {
  Pencil,
  Plus,
  MapPin,
  X,
  Sparkles,
  ClipboardPaste,
  Clipboard,
  ArrowLeft,
  Check,
  AlertTriangle,
  Phone,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  Image,
  Building2,
  Receipt,
  Info,
} from '@tamagui/lucide-icons';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
  className?: string;
}

const wrapIcon = (Component: React.ComponentType<any>) => {
  const Wrapped: React.FC<IconProps> = ({ size = 16, color = '#333333', strokeWidth = 2, style }) => (
    <Component size={size} color={color} strokeWidth={strokeWidth} style={style} />
  );
  return Wrapped;
};

export const LuPencil = wrapIcon(Pencil);
export const LuPlus = wrapIcon(Plus);
export const LuMapPin = wrapIcon(MapPin);
export const LuX = wrapIcon(X);
export const LuSparkles = wrapIcon(Sparkles);
export const LuClipboardPaste = wrapIcon(ClipboardPaste);
export const LuClipboard = wrapIcon(Clipboard);
export const LuArrowLeft = wrapIcon(ArrowLeft);
export const LuCheck = wrapIcon(Check);
export const LuTriangleAlert = wrapIcon(AlertTriangle);
export const LuPhone = wrapIcon(Phone);
export const LuExternalLink = wrapIcon(ExternalLink);
export const LuTrash2 = wrapIcon(Trash2);
export const LuChevronDown = wrapIcon(ChevronDown);
export const LuChevronRight = wrapIcon(ChevronRight);
export const LuImage = wrapIcon(Image);
export const LuBuilding2 = wrapIcon(Building2);
export const LuReceipt = wrapIcon(Receipt);
export const LuInfo = wrapIcon(Info);
