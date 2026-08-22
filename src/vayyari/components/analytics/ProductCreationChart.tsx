import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { BarChart, stackDataItem } from 'react-native-gifted-charts';
import type { DailyCreationPoint } from '@/services/analytics.service';

interface ProductCreationChartProps {
  data: DailyCreationPoint[];
  loading?: boolean;
  selectedDate?: string | null;
  onBarPress?: (item: DailyCreationPoint) => void;
  timeframe?: '7d' | '30d' | '90d' | 'all';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductCreationChart: React.FC<ProductCreationChartProps> = ({
  data,
  loading = false,
  selectedDate,
  onBarPress,
  timeframe = '7d',
}) => {
  const theme = useTheme();

  const totalVolume = useMemo(() => {
    return data.reduce((sum, item) => sum + item.totalCreated, 0);
  }, [data]);

  const maxDailyValue = useMemo(() => {
    const max = Math.max(...data.map(d => d.totalCreated), 0);
    return max <= 5 ? 5 : Math.ceil(max * 1.25);
  }, [data]);

  const chartData: stackDataItem[] = useMemo(() => {
    const isDense = data.length > 14;

    return data.map((item, index) => {
      const isSelected = selectedDate === item.date;
      const unstarredCount = Math.max(0, item.totalCreated - item.starredCount);
      const starredCount = item.starredCount;

      // Color accents
      const baseColor = isSelected ? theme.colors.primary : `${theme.colors.primary}D0`;
      const starColor = isSelected ? '#FFB300' : '#FFA000';

      return {
        stacks: [
          {
            value: unstarredCount,
            color: unstarredCount > 0 ? baseColor : 'transparent',
            marginBottom: 1,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
          },
          {
            value: starredCount,
            color: starredCount > 0 ? starColor : 'transparent',
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          },
        ],
        // Show every Nth label if dense
        label: isDense && index % Math.ceil(data.length / 7) !== 0 ? '' : item.displayDate,
        labelTextStyle: {
          color: theme.colors.onSurfaceVariant,
          fontSize: 10,
          fontWeight: isSelected ? '700' : '400',
        },
        onPress: () => onBarPress?.(item),
      };
    });
  }, [data, selectedDate, theme.colors, onBarPress]);

  // Adjust bar width and spacing based on data count
  const barConfig = useMemo(() => {
    if (data.length <= 7) {
      return { barWidth: 24, spacing: 20, initialSpacing: 16 };
    }
    if (data.length <= 14) {
      return { barWidth: 16, spacing: 12, initialSpacing: 12 };
    }
    if (data.length <= 30) {
      return { barWidth: 10, spacing: 8, initialSpacing: 8 };
    }
    return { barWidth: 6, spacing: 4, initialSpacing: 6 };
  }, [data.length]);

  if (loading) {
    return (
      <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
            Loading analytics trends...
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
      {/* Header & Legend */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={styles.title}>
            Ingestion & Curation Trend
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Daily product velocity & starred counts
          </Text>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Created
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFA000' }]} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Starred
            </Text>
          </View>
        </View>
      </View>

      {/* Empty State */}
      {data.length === 0 || totalVolume === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center' }}>
            No product activity recorded for this period.
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrapper}>
          <BarChart
            stackData={chartData}
            width={SCREEN_WIDTH - 84}
            height={180}
            barWidth={barConfig.barWidth}
            spacing={barConfig.spacing}
            initialSpacing={barConfig.initialSpacing}
            maxValue={maxDailyValue}
            noOfSections={4}
            rulesType="dashed"
            rulesColor={theme.colors.outlineVariant}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={theme.colors.outlineVariant}
            yAxisTextStyle={{ color: theme.colors.outline, fontSize: 10 }}
            isAnimated
            animationDuration={350}
            hideRules={false}
          />
        </View>
      )}

      {/* Active Bar Filter Selection Detail */}
      {selectedDate && (
        <View style={styles.selectedDetailRow}>
          <Chip
            icon="calendar-filter"
            onClose={() => onBarPress?.({ date: '', displayDate: '', totalCreated: 0, starredCount: 0 })}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ color: theme.colors.onPrimaryContainer, fontSize: 12 }}
          >
            Filter: {selectedDate}
          </Chip>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDetailRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
