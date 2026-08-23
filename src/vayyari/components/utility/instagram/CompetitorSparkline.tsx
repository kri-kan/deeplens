import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useTheme, Text } from 'react-native-paper';
import { OutlierDataPoint } from '@/services/instagram.service';

interface CompetitorSparklineProps {
  points?: OutlierDataPoint[];
  width?: number;
  height?: number;
  multiplier?: number;
  dayNumber?: number;
}

export const CompetitorSparkline: React.FC<CompetitorSparklineProps> = ({
  points,
  width = 140,
  height = 64,
  multiplier = 2.5,
  dayNumber = 1,
}) => {
  const theme = useTheme();

  // Fallback points if none provided
  const dataPoints: OutlierDataPoint[] = points && points.length > 0 ? points : [
    { day: 0, actualLikes: 0, baselineLikes: 0 },
    { day: 1, actualLikes: dayNumber === 1 ? 70 : 25, baselineLikes: 20 },
    { day: 2, actualLikes: dayNumber === 1 ? 90 : 45, baselineLikes: 35 },
    { day: 3, actualLikes: 100, baselineLikes: 45 },
    { day: 5, actualLikes: 110, baselineLikes: 50 },
    { day: 7, actualLikes: 115, baselineLikes: 55 },
  ];

  const padX = 8;
  const padY = 8;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  const maxVal = Math.max(
    ...dataPoints.map((p) => Math.max(p.actualLikes || 0, p.baselineLikes || 0)),
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
  const generatePath = (valKey: 'actualLikes' | 'baselineLikes') => {
    if (dataPoints.length === 0) return '';
    let path = `M ${getX(0)} ${getY(dataPoints[0][valKey] || 0)}`;

    for (let i = 1; i < dataPoints.length; i++) {
      const x0 = getX(i - 1);
      const y0 = getY(dataPoints[i - 1][valKey] || 0);
      const x1 = getX(i);
      const y1 = getY(dataPoints[i][valKey] || 0);
      const cpx = (x0 + x1) / 2;
      path += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return path;
  };

  const actualPath = generatePath('actualLikes');
  const baselinePath = generatePath('baselineLikes');

  // Closed area path for actual gradient
  const areaPath = actualPath
    ? `${actualPath} L ${getX(dataPoints.length - 1)} ${padY + innerHeight} L ${getX(0)} ${padY + innerHeight} Z`
    : '';

  const peakIndex = dataPoints.reduce((maxIdx, p, idx, arr) => (p.actualLikes > (arr[maxIdx]?.actualLikes || 0) ? idx : maxIdx), 0);
  const peakX = getX(peakIndex);
  const peakY = getY(dataPoints[peakIndex]?.actualLikes || 0);

  const isTakeoff = dayNumber <= 1;
  const actualLineColor = isTakeoff ? '#F59E0B' : '#EF4444'; // Amber for day 1 takeoff, Red/Coral for spike
  const actualGradientId = `sparklineGrad_${multiplier}_${dayNumber}_${Math.round(maxVal)}`;

  return (
    <View style={[styles.container, { width, height }]}>
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
        <Circle
          cx={peakX}
          cy={peakY}
          r={3.5}
          fill={actualLineColor}
        />
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
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDotDashed, { borderColor: theme.colors.onSurfaceVariant }]} />
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Avg</Text>
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
