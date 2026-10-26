import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';

export interface MetricStatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  valueColor?: string;
}

export const MetricStatCard: React.FC<MetricStatCardProps> = ({
  label,
  value,
  subtitle,
  valueColor = '#FFFFFF',
}) => {
  return (
    <View style={styles.card}>
      <YStack gap="$1">
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
  },
});
