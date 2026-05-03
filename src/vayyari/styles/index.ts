import { StyleSheet } from 'react-native';

// Standardized tokens for the app
export const Tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 4,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  opacity: {
    muted: 0.6,
    disabled: 0.3,
  }
};

export const CommonStyles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: 'bold',
  },
  mt1: { marginTop: Tokens.spacing.sm },
  mt2: { marginTop: Tokens.spacing.md },
  mb1: { marginBottom: Tokens.spacing.sm },
  mb2: { marginBottom: Tokens.spacing.md },
  p1: { padding: Tokens.spacing.sm },
  p2: { padding: Tokens.spacing.md },
});
