import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export interface ViewfinderLensIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

/**
 * ViewfinderLensIcon (Visual Lens / AI Scanner Icon)
 * 
 * Accurately replicates the scanner viewfinder with aperture eye:
 * - 4 rounded corner viewfinder brackets
 * - Outer concentric ring
 * - Inner pupil / iris with secondary circular highlight cutouts
 */
export const ViewfinderLensIcon: React.FC<ViewfinderLensIconProps> = ({
  size = 24,
  color = '#22D3EE',
  strokeWidth = 2,
  style,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* Top-Left Corner Bracket */}
      <Path
        d="M3 8.5V5.5C3 4.11929 4.11929 3 5.5 3H8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Top-Right Corner Bracket */}
      <Path
        d="M15.5 3H18.5C19.8807 3 21 4.11929 21 5.5V8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Bottom-Left Corner Bracket */}
      <Path
        d="M3 15.5V18.5C3 19.8807 4.11929 21 5.5 21H8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Bottom-Right Corner Bracket */}
      <Path
        d="M15.5 21H18.5C19.8807 21 21 19.8807 21 18.5V15.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Outer Concentric Lens Ring */}
      <Circle
        cx="12"
        cy="12"
        r="6.2"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* Inner Pupil with Highlight Catchlight Cutouts */}
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5ZM13.8 11.2C14.3523 11.2 14.8 10.7523 14.8 10.2C14.8 9.64772 14.3523 9.2 13.8 9.2C13.2477 9.2 12.8 9.64772 12.8 10.2C12.8 10.7523 13.2477 11.2 13.8 11.2ZM13.9 12.7C14.1209 12.7 14.3 12.5209 14.3 12.3C14.3 12.0791 14.1209 11.9 13.9 11.9C13.6791 11.9 13.5 12.0791 13.5 12.3C13.5 12.5209 13.6791 12.7 13.9 12.7Z"
        fill={color}
      />
    </Svg>
  );
};
