import React from 'react';
import { FontAwesome } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
  style?: any;
  className?: string;
}

export const RiWhatsappLine: React.FC<IconProps> = ({ size = 20, color = '#25D366', style }) => (
  <FontAwesome name="whatsapp" size={size} color={color} style={style} />
);

export const RiWhatsappFill: React.FC<IconProps> = ({ size = 20, color = '#25D366', style }) => (
  <FontAwesome name="whatsapp" size={size} color={color} style={style} />
);

export const RiInstagramLine: React.FC<IconProps> = ({ size = 20, color = '#E1306C', style }) => (
  <FontAwesome name="instagram" size={size} color={color} style={style} />
);

export const RiInstagramFill: React.FC<IconProps> = ({ size = 20, color = '#E1306C', style }) => (
  <FontAwesome name="instagram" size={size} color={color} style={style} />
);
