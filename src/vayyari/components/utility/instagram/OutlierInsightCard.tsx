import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, useTheme, Icon, IconButton, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { HighPerformingCompetitorPost, InstagramMediaType } from '@/services/instagram.service';
import { CompetitorSparkline } from './CompetitorSparkline';
import { getMediaUri } from '@/utils/instagram-helpers';

interface OutlierInsightCardProps {
  item: HighPerformingCompetitorPost;
  onPress?: () => void;
}

export const OutlierInsightCard: React.FC<OutlierInsightCardProps> = ({ item, onPress }) => {
  const theme = useTheme();
  const router = useRouter();
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [isOpeningInsta, setIsOpeningInsta] = useState(false);

  const multiplier = item.multiplier ?? 2.5;
  const dayNumber = item.dayNumber ?? 1;
  const isDayOne = dayNumber <= 1;

  const multiplierBadgeText = isDayOne
    ? `⚡ ${multiplier.toFixed(1)}x vs Profile Avg (Day 1)`
    : `🔥 ${multiplier.toFixed(1)}x vs Profile Avg (Day ${dayNumber})`;

  const badgeBgColor = isDayOne
    ? '#FEF3C7' // Warm amber container
    : '#FEE2E2'; // Soft red/coral container
  const badgeTextColor = isDayOne
    ? '#B45309' // Amber 700
    : '#B91C1C'; // Red 700

  const handleOpenInstagram = async () => {
    setIsOpeningInsta(true);
    const platformId = item.platformVideoId || item.id;
    try {
      if (platformId) {
        const nativeUrl = `instagram://media?id=${platformId}`;
        const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(nativeUrl);
          setIsOpeningInsta(false);
          return;
        }
      }
      if (item.permalink) {
        await Linking.openURL(item.permalink);
      } else if (platformId) {
        await Linking.openURL(`https://www.instagram.com/p/${platformId}/`);
      }
    } catch (err) {
      console.warn('Could not open Instagram link', err);
      if (item.permalink) {
        await Linking.openURL(item.permalink).catch(() => {});
      }
    } finally {
      setIsOpeningInsta(false);
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/utilities/instagram/post-detail',
        params: {
          id: item.id,
          username: item.ownerUsername || '',
          data: JSON.stringify(item),
        },
      } as any);
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const imageUri = getMediaUri(item, 'medium') || item.thumbnailUrl || item.mediaUrl || '';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      {/* Header: Author Info & Outlier Tag */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {item.ownerProfilePictureUrl ? (
            <Image
              source={{ uri: item.ownerProfilePictureUrl }}
              style={styles.authorAvatar}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.authorAvatarPlaceholder,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.authorAvatarInitials,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {(item.ownerUsername || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.authorDetails}>
            <Text
              variant="labelMedium"
              style={styles.authorHandle}
              numberOfLines={1}
            >
              @{item.ownerUsername || 'competitor'}
            </Text>
            <View style={styles.nicheBadgeRow}>
              {item.niche && (
                <View
                  style={[
                    styles.nichePill,
                    { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
                  ]}
                >
                  <Text variant="labelSmall" style={styles.nicheText}>
                    {item.niche}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Multiplier Badge */}
        <View style={[styles.multiplierBadge, { backgroundColor: badgeBgColor }]}>
          <Text style={[styles.multiplierText, { color: badgeTextColor }]}>
            {multiplierBadgeText}
          </Text>
        </View>
      </View>

      {/* Main Content: Thumbnail Preview + Sparkline Curve */}
      <View style={styles.contentRow}>
        {/* Thumbnail Preview */}
        <View style={styles.mediaPreviewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
          {item.mediaType === InstagramMediaType.VIDEO && (
            <View style={styles.videoIndicator}>
              <Icon source="play" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Sparkline & Comparison Metrics */}
        <View style={styles.sparklineSection}>
          <View style={styles.metricsSummary}>
            <View style={styles.metricBlock}>
              <Text variant="labelSmall" style={styles.metricLabel}>
                Current Likes
              </Text>
              <Text
                variant="titleSmall"
                style={[
                  styles.metricValue,
                  { color: theme.colors.onSurface },
                ]}
              >
                {formatNumber(item.likeCount)}
              </Text>
            </View>

            <View style={styles.metricBlock}>
              <Text variant="labelSmall" style={styles.metricLabel}>
                Baseline Avg
              </Text>
              <Text
                variant="titleSmall"
                style={[
                  styles.metricValue,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formatNumber(item.baselineAvgLikes)}
              </Text>
            </View>
          </View>

          {/* SVG Trajectory Sparkline */}
          <CompetitorSparkline
            points={item.curvePoints}
            width={150}
            height={68}
            multiplier={multiplier}
            dayNumber={dayNumber}
          />
        </View>
      </View>

      {/* Caption Snippet */}
      {item.caption ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setCaptionExpanded(!captionExpanded)}
          style={styles.captionContainer}
        >
          <Text
            variant="bodySmall"
            numberOfLines={captionExpanded ? undefined : 2}
            style={[
              styles.captionText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {item.caption}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Action Tray: Stats + 1-Tap Open In Instagram Button */}
      <View style={styles.footerTray}>
        <View style={styles.statsRow}>
          <Text variant="labelSmall" style={styles.statPill}>
            ❤️ {formatNumber(item.likeCount)}
          </Text>
          <Text variant="labelSmall" style={styles.statPill}>
            💬 {formatNumber(item.commentCount)}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenInstagram}
          disabled={isOpeningInsta}
          style={[
            styles.instagramButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          {isOpeningInsta ? (
            <ActivityIndicator size={14} color="#FFFFFF" />
          ) : (
            <>
              <Icon source="instagram" size={16} color="#FFFFFF" />
              <Text style={styles.instagramButtonText}>Open in Instagram</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  authorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarInitials: {
    fontWeight: '700',
    fontSize: 14,
  },
  authorDetails: {
    flex: 1,
  },
  authorHandle: {
    fontWeight: '700',
    fontSize: 13,
  },
  nicheBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  nichePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  nicheText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  multiplierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  multiplierText: {
    fontWeight: '800',
    fontSize: 11,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  mediaPreviewContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklineSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metricsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  metricBlock: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 10,
    opacity: 0.6,
    fontWeight: '500',
  },
  metricValue: {
    fontWeight: '800',
    fontSize: 13,
  },
  captionContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  captionText: {
    lineHeight: 18,
  },
  footerTray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statPill: {
    fontWeight: '700',
    fontSize: 11,
    opacity: 0.8,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  instagramButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
});
