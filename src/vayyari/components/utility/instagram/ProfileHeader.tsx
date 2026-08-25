import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, IconButton, useTheme, Icon, ActivityIndicator } from 'react-native-paper';
import { ProfileAvatar } from './ProfileAvatar';
import { CompetitorSparkline } from './CompetitorSparkline';
import { normalizeProfile } from '@/utils/instagram-helpers';
import {
  instagramService,
  type InstagramProfile,
  type ProfileMetrics,
  type CompetitorProfileCurveResponse,
} from '@/services/instagram.service';

export interface ProfileHeaderProps {
  profile: InstagramProfile | any; // accepts raw API shape, normalized internally
  metrics: ProfileMetrics | null;
  onShowSettings: () => void;
  bioExpanded: boolean;
  onToggleBio: () => void;
  onBack?: () => void;
  isCompetitorProfile?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile: rawProfile,
  metrics,
  onShowSettings,
  bioExpanded,
  onToggleBio,
  onBack,
  isCompetitorProfile: isCompetitorProp,
}) => {
  const theme = useTheme();
  const profile = normalizeProfile(rawProfile);

  const isCompetitor =
    isCompetitorProp !== undefined
      ? isCompetitorProp
      : ((profile?.profileCategory || '').toLowerCase() === 'competitors' ||
         (profile?.profileCategory || '').toLowerCase() === 'competitor');

  const [curveData, setCurveData] = useState<CompetitorProfileCurveResponse | null>(null);
  const [loadingCurve, setLoadingCurve] = useState(false);
  const [sparklineWidth, setSparklineWidth] = useState(0);

  useEffect(() => {
    if (!isCompetitor) return;
    const targetId = profile.id || profile.username;
    if (!targetId) return;

    let isMounted = true;
    setLoadingCurve(true);

    instagramService
      .getCompetitorProfileCurve(targetId)
      .then((data) => {
        if (isMounted && data) {
          setCurveData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load competitor profile curve in ProfileHeader', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCurve(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile.id, profile.username, isCompetitor]);

  const defaultWidth = Dimensions.get('window').width - 56;
  const chartWidth = sparklineWidth > 0 ? sparklineWidth : defaultWidth;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ProfileAvatar
          profile={{ ...profile, isInWatchlist: true }}
          size={80}
          showBadge={true}
          style={styles.avatar}
        />
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <View style={styles.nameContainer}>
              {onBack && (
                <IconButton
                  icon="arrow-left"
                  size={20}
                  style={styles.backIcon}
                  onPress={onBack}
                />
              )}
              <Text variant="titleLarge" style={styles.bold}>{profile.name}</Text>
            </View>
            <IconButton icon="cog" size={20} style={styles.settingsIcon} onPress={onShowSettings} />
          </View>
          {profile.lastSyncedAt && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 4 }}
            >
              Last Scraped: {new Date(profile.lastSyncedAt).toLocaleString()}
            </Text>
          )}
          <Text
            variant="bodySmall"
            style={styles.bio}
            numberOfLines={bioExpanded ? undefined : 3}
            onPress={onToggleBio}
          >
            {profile.biography}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 12, marginHorizontal: 16 }]}>
        <StatBox label="Followers" value={(profile?.followersCount || 0).toLocaleString()} />
        <StatBox label="Posts" value={profile?.mediaCount || 0} />
        <StatBox label="Avg. Likes" value={(metrics?.avgLikes || 0).toLocaleString()} />
        <StatBox label="Eng. Rate" value={metrics?.engagementRate !== undefined ? `${metrics.engagementRate.toFixed(2)}%` : '0.00%'} />
      </View>

      {/* Competitor Profile Trajectory Sparkline Curve with Metric Toggle */}
      {isCompetitor && (
        <View
          style={[
            styles.curveCard,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width - 24;
            if (w > 0) setSparklineWidth(w);
          }}
        >
          <View style={styles.curveCardHeader}>
            <View style={styles.curveHeaderLeft}>
              <Icon source="trending-up" size={18} color={theme.colors.primary} />
              <Text variant="labelMedium" style={[styles.curveTitle, { color: theme.colors.onSurface }]}>
                Growth Trajectory Curve
              </Text>
            </View>
            {curveData?.multiplier ? (
              <View style={[styles.velocityBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.velocityBadgeText}>
                  ⚡ {curveData.multiplier.toFixed(1)}x Velocity
                </Text>
              </View>
            ) : null}
          </View>

          {loadingCurve ? (
            <View style={styles.curveLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Loading profile trajectory curve...
              </Text>
            </View>
          ) : (
            <View style={styles.sparklineWrapper}>
              <CompetitorSparkline
                points={curveData?.points}
                width={chartWidth}
                height={78}
                multiplier={curveData?.multiplier ?? 2.0}
                dayNumber={curveData?.dayNumber ?? 1}
                defaultMetric="views"
                showMetricSelector={true}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statBox}>
    <Text variant="titleMedium" style={styles.bold}>{value}</Text>
    <Text variant="labelSmall">{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  meta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  backIcon: {
    margin: 0,
    marginRight: 4,
  },
  settingsIcon: {
    margin: 0,
  },
  bold: {
    fontWeight: 'bold',
  },
  bio: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 4,
  },
  statBox: {
    alignItems: 'center',
  },
  curveCard: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    gap: 8,
  },
  curveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  curveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  curveTitle: {
    fontWeight: '800',
  },
  velocityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  velocityBadgeText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 10,
  },
  curveLoadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklineWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
