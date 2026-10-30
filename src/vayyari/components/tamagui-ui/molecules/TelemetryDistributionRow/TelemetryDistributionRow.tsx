import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';

export interface TelemetryDistributionRowProps {
  label: string;
  count: number;
  percentage: number;
  barColor?: string;
  onPress?: () => void;
}

export const TelemetryDistributionRow: React.FC<TelemetryDistributionRowProps> = ({
  label,
  count,
  percentage,
  barColor = '#6366F1',
  onPress,
}) => {
  const RowContainer = onPress ? Pressable : View;

  return (
    <RowContainer
      onPress={onPress}
      style={({ pressed }: any) => [
        onPress && styles.interactiveRow,
        pressed && styles.rowPressed,
      ]}
    >
      <XStack alignItems="center" justifyContent="space-between" marginVertical="$1.5">
        <Text style={[styles.label, onPress && styles.interactiveLabel]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, Math.max(2, percentage))}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.val}>{count}</Text>
      </XStack>
    </RowContainer>
  );
};

const styles = StyleSheet.create({
  label: {
    width: 90,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  val: {
    width: 35,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  interactiveRow: {
    cursor: 'pointer' as any,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  interactiveLabel: {
    color: '#E5E7EB',
  },
});
