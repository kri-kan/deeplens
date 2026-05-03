import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface SectionProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  headerStyle?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  children,
  rightAction,
  style,
  headerStyle,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.section, style]}>
      <View style={[styles.header, headerStyle]}>
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="bodySmall" style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightAction}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    opacity: 0.8,
  },
  subtitle: {
    opacity: 0.6,
  },
});
