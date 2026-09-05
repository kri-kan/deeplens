import React, { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

export type FormFactor = 'desktop' | 'tablet' | 'mobile';

export interface FormFactorContextValue {
  factor: FormFactor;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  containerWidth: number | string;
}

export const FormFactorContext = createContext<FormFactorContextValue | null>(null);

export function useResponsive(): FormFactorContextValue {
  const context = useContext(FormFactorContext);
  const { width } = useWindowDimensions();

  if (context) {
    return context;
  }

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const factor: FormFactor = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    factor,
    isMobile,
    isTablet,
    isDesktop,
    containerWidth: width,
  };
}
