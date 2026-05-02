import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

export type SurfaceLevel = 'surfaceContainerLowest' | 'surfaceContainerLow' | 'surfaceContainer' | 'surfaceContainerHigh';

interface BentoCardProps {
  children: React.ReactNode;
  surfaceLevel?: SurfaceLevel;
  style?: StyleProp<ViewStyle>;
  paddingBottom?: number;
}

export function BentoCard({ children, surfaceLevel = 'surfaceContainerLowest', style, paddingBottom }: BentoCardProps) {
  const theme = useTheme();

  return (
    <Surface
      elevation={0}
      style={[
        styles.bentoCard,
        { backgroundColor: (theme.colors as any)[surfaceLevel] },
        paddingBottom !== undefined && { paddingBottom },
        style,
      ]}
    >
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  bentoCard: {
    padding: 24,
    borderRadius: 24, // lg radius for bento cells
  },
});
