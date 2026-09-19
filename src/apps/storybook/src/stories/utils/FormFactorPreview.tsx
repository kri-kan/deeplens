import React from 'react';
import { FormFactor } from '../../theme';
import {
  FormFactorShell,
  withFormFactorShell,
  FormFactorShellProps,
} from '../../components/templates/FormFactorShell';

export type { FormFactor };

export interface FormFactorPreviewProps {
  children: React.ReactNode;
  initialFactor?: FormFactor;
  allowSwitching?: boolean;
  title?: string;
  category?: string;
}

/**
 * Legacy FormFactorPreview adapter that delegates directly to canonical FormFactorShell.
 * @deprecated Use FormFactorShell directly from components/templates/FormFactorShell
 */
export function FormFactorPreview({
  children,
  initialFactor = 'desktop',
  title,
  category,
}: FormFactorPreviewProps) {
  return (
    <FormFactorShell initialFactor={initialFactor} title={title} category={category}>
      {children}
    </FormFactorShell>
  );
}

/**
 * Legacy withFormFactor decorator adapter that delegates directly to canonical withFormFactorShell.
 * @deprecated Use story parameter { formFactorShell: { defaultFactor } } or withFormFactorShell
 */
export function withFormFactor(factor: FormFactor, title?: string) {
  return withFormFactorShell(factor, title);
}

export { withFormFactorShell };
