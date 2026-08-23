import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { instagramService, CompetitorsSummaryResponse } from '@/services/instagram.service';

interface CompetitorBannerProps {
  onPress?: () => void;
}

export const CompetitorBanner: React.FC<CompetitorBannerProps> = ({ onPress }) => {
  const theme = useTheme();
  const router = useRouter();
  const [summary, setSummary] = useState<CompetitorsSummaryResponse | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await instagramService.getCompetitorsSummary();
      setSummary(data);
    } catch (err) {
      console.warn('CompetitorBanner: failed to load summary', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/utilities/instagram/competitors');
    }
  };

  const activeCount = summary?.activeCount ?? 30;
  const totalLimit = summary?.totalLimit ?? 50;
  const breakoutsCount = summary?.breakoutsTodayCount ?? 4;
  const progressRatio = totalLimit > 0 ? Math.min(1, Math.max(0, activeCount / totalLimit)) : 0.6;
  const progressPercent = `${Math.round(progressRatio * 100)}%`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      {/* Header Row: Live Dot + Title & Active Ratio Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.liveDot} />
          <Text
            variant="labelMedium"
            style={[
              styles.titleText,
              { color: theme.colors.primary },
            ]}
          >
            COMPETITORS
          </Text>
        </View>

        <View
          style={[
            styles.ratioBadge,
            {
              backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface,
            },
          ]}
        >
          <Text
            variant="labelSmall"
            style={[
              styles.ratioText,
              { color: theme.colors.onSurface },
            ]}
          >
            {activeCount} / {totalLimit} Active
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBarTrack,
          {
            backgroundColor: theme.colors.elevation?.level2 || 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: progressPercent as any,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>

      {/* Bottom Row: Breakouts Badge & Navigation Action */}
      <View style={styles.bottomRow}>
        <View
          style={[
            styles.breakoutPill,
            {
              backgroundColor: theme.colors.errorContainer,
            },
          ]}
        >
          <Text
            variant="labelSmall"
            style={[
              styles.breakoutPillText,
              { color: theme.colors.onErrorContainer },
            ]}
          >
            ⚡ {breakoutsCount} Breakout{breakoutsCount === 1 ? '' : 's'} Today
          </Text>
        </View>

        <View style={styles.actionGroup}>
          <Text
            variant="labelSmall"
            style={[
              styles.actionText,
              { color: theme.colors.primary },
            ]}
          >
            Explore Hub
          </Text>
          <Icon source="chevron-right" size={18} color={theme.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  titleText: {
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  ratioBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratioText: {
    fontWeight: '700',
    fontSize: 11,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakoutPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  breakoutPillText: {
    fontWeight: '700',
    fontSize: 11,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
