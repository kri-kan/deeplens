import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuChevronRight } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { CurationHubTileProps } from './types';
import { HubMetricDivider } from './HubMetricDivider';
import { HubMetricItem } from './HubMetricItem';

export function CurationHubTile({
  title,
  icon,
  iconBg,
  metrics,
  metricsSlot,
  onPress,
  isSelected = false,
  showChevron = true,
  minHeight = 84,
  style,
  testID,
}: CurationHubTileProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          minHeight,
          borderColor: isSelected ? tokens.accent : tokens.border,
          backgroundColor: pressed ? `${tokens.accent}08` : tokens.surface,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Top Header Row */}
      <XStack alignItems="center" gap={8} width="100%">
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: iconBg || `${tokens.accent}14` },
          ]}
        >
          {icon}
        </View>
        <Text
          fontSize={13}
          fontWeight="900"
          lineHeight={16}
          color={tokens.text}
          flex={1}
          flexWrap="wrap"
          style={{ flex: 1, minWidth: 0 } as any}
        >
          {title}
        </Text>
        {showChevron && <LuChevronRight size={14} color={tokens.textMuted} />}
      </XStack>

      {/* Bottom Metrics Row: Inline pipe-separated items */}
      <XStack alignItems="center" gap={6} flexWrap="wrap" width="100%">
        {metricsSlot ? (
          metricsSlot
        ) : (
          metrics?.map((m, idx) => (
            <React.Fragment key={m.id || idx}>
              {idx > 0 && <HubMetricDivider color={tokens.border} />}
              <HubMetricItem
                icon={m.icon}
                label={m.label}
                color={m.color || tokens.text}
                fontWeight={m.fontWeight || '800'}
                fontSize={m.fontSize || 11}
              />
            </React.Fragment>
          ))
        )}
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    cursor: 'pointer',
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
