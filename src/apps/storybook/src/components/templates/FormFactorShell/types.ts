import { DimensionValue } from 'react-native';
import { FormFactor } from '../../../theme';

export type Orientation = 'portrait' | 'landscape';

export interface FormFactorShellProps {
  children: React.ReactNode;
  initialFactor?: FormFactor;
  defaultFactor?: FormFactor;
  title?: string;
  category?: string;
  allowOrientationToggle?: boolean;
  allowBezelToggle?: boolean;
  defaultBezel?: boolean;
  forceStandalone?: boolean;
  onFactorChange?: (factor: FormFactor) => void;
}

export interface FormFactorDimensions {
  width: DimensionValue;
  height?: DimensionValue;
  label: string;
}
