import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { LuChevronRight } from '../../icons/lu';

export interface MetricStatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  valueColor?: string;
  onPress?: () => void;
}

export const MetricStatCard: React.FC<MetricStatCardProps> = ({
  label,
  value,
  subtitle,
  valueColor = '#FFFFFF',
  onPress,
}) => {
  const CardContainer = onPress ? Pressable : View;

  return (
    <CardContainer
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.card,
        onPress && styles.interactiveCard,
        pressed && styles.cardPressed,
      ]}
    >
      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text style={styles.label}>{label}</Text>
          {onPress ? <LuChevronRight size={14} color="#6B7280" /> : null}
        </XStack>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </YStack>
    </CardContainer>
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
  interactiveCard: {
    cursor: 'pointer' as any,
  },
  cardPressed: {
    opacity: 0.8,
    borderColor: '#0D9488',
    backgroundColor: '#131D2E',
  },
});
