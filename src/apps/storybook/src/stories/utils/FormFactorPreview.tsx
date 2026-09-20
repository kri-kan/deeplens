import React from 'react';
import { FormFactor, FormFactorContext } from '../../theme';
import {
  FormFactorShell,
  withFormFactorShell,
  FormFactorShellProps,
} from '../../components/templates/FormFactorShell';

export type { FormFactor };

export interface FormFactorPreviewProps {
  children: React.ReactNode;
  initialFactor?: FormFactor;
  defaultFactor?: FormFactor;
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
  initialFactor = 'mobile',
  defaultFactor,
  title,
  category,
}: FormFactorPreviewProps) {
  const existingContext = React.useContext(FormFactorContext);
  if (existingContext) {
    return <>{children}</>;
  }
  return (
    <FormFactorShell initialFactor={defaultFactor || initialFactor} title={title} category={category}>
      {children}
    </FormFactorShell>
  );
}

/**
 * Legacy withFormFactor decorator adapter that delegates directly to canonical withFormFactorShell.
 * @deprecated Use story parameter { formFactorShell: { defaultFactor } } or withFormFactorShell
 */
export function withFormFactor(factor: FormFactor = 'mobile', title?: string) {
  return withFormFactorShell(factor, title);
}

export { withFormFactorShell };
