import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface ProfileCopyIconProps {
  size?: number;
  color?: string;
}

export const ProfileCopyIcon = ({ size = 24, color = '#000' }: ProfileCopyIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Back Card */}
      <Rect 
        x="7" 
        y="2" 
        width="14" 
        height="18" 
        rx="2" 
        stroke={color} 
        strokeWidth="2" 
      />
      {/* Front Card */}
      <Rect 
        x="3" 
        y="6" 
        width="14" 
        height="16" 
        rx="2" 
        fill="white"
        stroke={color} 
        strokeWidth="2" 
      />
      {/* Person Icon in Front Card */}
      {/* Head */}
      <Circle cx="10" cy="12" r="2.5" fill={color} />
      {/* Body */}
      <Path 
        d="M6 18C6 16.3431 7.79086 15 10 15C12.2091 15 14 16.3431 14 18" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </Svg>
  );
};
