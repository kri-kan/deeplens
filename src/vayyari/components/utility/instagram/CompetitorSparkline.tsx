import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useTheme, Text } from 'react-native-paper';
import { OutlierDataPoint } from '@/services/instagram.service';

interface CompetitorSparklineProps {
  points?: OutlierDataPoint[];
  width?: number;
  height?: number;
  multiplier?: number;
  dayNumber?: number;
  defaultMetric?: 'likes' | 'views' | 'comments';
  showMetricSelector?: boolean;
}

export const CompetitorSparkline: React.FC<CompetitorSparklineProps> = ({
  points,
  width = 150,
  height = 68,
  multiplier = 2.5,
  dayNumber = 1,
  defaultMetric = 'views',
  showMetricSelector = true,
}) => {
  const theme = useTheme();
  const [activeMetric, setActiveMetric] = useState<'likes' | 'views' | 'comments'>(defaultMetric);

  // Fallback points if none provided
  const dataPoints: OutlierDataPoint[] = points && points.length > 0 ? points : [
    { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
    { day: 1, actualLikes: dayNumber === 1 ? 70 : 25, baselineLikes: 20, actualViews: dayNumber === 1 ? 520 : 180, baselineViews: 150, actualComments: dayNumber === 1 ? 22 : 8, baselineComments: 6 },
    { day: 2, actualLikes: dayNumber === 1 ? 90 : 45, baselineLikes: 35, actualViews: dayNumber === 1 ? 680 : 340, baselineViews: 260, actualComments: dayNumber === 1 ? 28 : 14, baselineComments: 10 },
    { day: 3, actualLikes: 100, baselineLikes: 45, actualViews: 750, baselineViews: 340, actualComments: 32, baselineComments: 14 },
    { day: 5, actualLikes: 110, baselineLikes: 50, actualViews: 830, baselineViews: 380, actualComments: 36, baselineComments: 16 },
    { day: 7, actualLikes: 115, baselineLikes: 55, actualViews: 860, baselineViews: 410, actualComments: 38, baselineComments: 18 },
  ];

  const actualKey: keyof OutlierDataPoint =
    activeMetric === 'views' ? 'actualViews' : activeMetric === 'comments' ? 'actualComments' : 'actualLikes';
  const baselineKey: keyof OutlierDataPoint =
    activeMetric === 'views' ? 'baselineViews' : activeMetric === 'comments' ? 'baselineComments' : 'baselineLikes';

  const padX = 8;
  const padY = 8;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  const maxVal = Math.max(
    ...dataPoints.map((p) =>
      Math.max(
        (p[actualKey] as number) || 0,
        (p[baselineKey] as number) || 0
      )
    ),
    10
  );

  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padX;
    return padX + (index / (dataPoints.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    return padY + innerHeight - ratio * innerHeight;
  };

  // Generate smooth cubic bezier SVG path
  const generatePath = (valKey: keyof OutlierDataPoint) => {
    if (dataPoints.length === 0) return '';
    let path = `M ${getX(0)} ${getY((dataPoints[0][valKey] as number) || 0)}`;

    for (let i = 1; i < dataPoints.length; i++) {
      const x0 = getX(i - 1);
      const y0 = getY((dataPoints[i - 1][valKey] as number) || 0);
      const x1 = getX(i);
      const y1 = getY((dataPoints[i][valKey] as number) || 0);
      const cpx = (x0 + x1) / 2;
      path += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return path;
  };

  const actualPath = generatePath(actualKey);
  const baselinePath = generatePath(baselineKey);

  // Closed area path for actual gradient
  const areaPath = actualPath
    ? `${actualPath} L ${getX(dataPoints.length - 1)} ${padY + innerHeight} L ${getX(0)} ${padY + innerHeight} Z`
    : '';

  const peakIndex = dataPoints.reduce(
    (maxIdx, p, idx, arr) =>
      ((p[actualKey] as number) || 0) > ((arr[maxIdx]?.[actualKey] as number) || 0)
        ? idx
        : maxIdx,
    0
  );
  const peakX = getX(peakIndex);
  const peakY = getY((dataPoints[peakIndex]?.[actualKey] as number) || 0);

  const isTakeoff = dayNumber <= 1;
  const actualLineColor =
    activeMetric === 'views'
      ? '#3B82F6' // Blue for views
      : activeMetric === 'comments'
      ? '#10B981' // Emerald for comments
      : isTakeoff
      ? '#F59E0B' // Amber for day 1 takeoff likes
      : '#EF4444'; // Red/Coral for likes spike

  const actualGradientId = `sparklineGrad_${multiplier}_${dayNumber}_${activeMetric}_${Math.round(maxVal)}`;

  return (
    <View style={[styles.container, { width }]}>
      {showMetricSelector && (
        <View style={styles.metricToggleRow}>
          <TouchableOpacity
            onPress={() => setActiveMetric('views')}
            activeOpacity={0.7}
            style={[
              styles.metricPill,
              activeMetric === 'views' && {
                backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.metricPillText,
                {
                  color:
                    activeMetric === 'views'
                      ? '#3B82F6'
                      : theme.colors.onSurfaceVariant,
                  fontWeight: activeMetric === 'views' ? '800' : '500',
                },
              ]}
            >
              👁️ Views
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveMetric('likes')}
            activeOpacity={0.7}
            style={[
              styles.metricPill,
              activeMetric === 'likes' && {
                backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.metricPillText,
                {
                  color:
                    activeMetric === 'likes'
                      ? actualLineColor
                      : theme.colors.onSurfaceVariant,
                  fontWeight: activeMetric === 'likes' ? '800' : '500',
                },
              ]}
            >
              ❤️ Likes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveMetric('comments')}
            activeOpacity={0.7}
            style={[
              styles.metricPill,
              activeMetric === 'comments' && {
                backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.metricPillText,
                {
                  color:
                    activeMetric === 'comments'
                      ? '#10B981'
                      : theme.colors.onSurfaceVariant,
                  fontWeight: activeMetric === 'comments' ? '800' : '500',
                },
              ]}
            >
              💬 Comments
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={actualGradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={actualLineColor} stopOpacity="0.35" />
            <Stop offset="1" stopColor={actualLineColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Baseline Axis reference */}
        <Line
          x1={padX}
          y1={padY + innerHeight}
          x2={padX + innerWidth}
          y2={padY + innerHeight}
          stroke={theme.colors.onSurfaceVariant}
          strokeOpacity={0.15}
          strokeWidth={1}
        />

        {/* Shaded Area under actual curve */}
        {areaPath ? <Path d={areaPath} fill={`url(#${actualGradientId})`} /> : null}

        {/* Baseline Curve (Dashed) */}
        <Path
          d={baselinePath}
          stroke={theme.colors.onSurfaceVariant}
          strokeWidth={1.5}
          strokeDasharray="3,3"
          strokeOpacity={0.45}
          fill="none"
        />

        {/* Actual Performance Curve */}
        <Path
          d={actualPath}
          stroke={actualLineColor}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />

        {/* Peak/Inflection Point Circle */}
        <Circle cx={peakX} cy={peakY} r={3.5} fill={actualLineColor} />
        <Circle
          cx={peakX}
          cy={peakY}
          r={6}
          stroke={actualLineColor}
          strokeWidth={1.5}
          strokeOpacity={0.4}
          fill="none"
        />
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: actualLineColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>
            Actual
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDotDashed, { borderColor: theme.colors.onSurfaceVariant }]} />
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>
            Avg
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  metricToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metricPillText: {
    fontSize: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendDotDashed: {
    width: 6,
    height: 2,
    borderWidth: 1,
    borderRadius: 1,
    opacity: 0.6,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.7,
  },
});
