import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Switch, useTheme, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CompetitorProfile } from '@/services/instagram.service';
import { ProfileAvatar } from './ProfileAvatar';

interface CompetitorProfileItemProps {
  item: CompetitorProfile;
  onToggleTracking: (username: string, nextTrackedState: boolean) => Promise<void>;
  onPress?: () => void;
}

export const CompetitorProfileItem: React.FC<CompetitorProfileItemProps> = ({
  item,
  onToggleTracking,
  onPress,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const [isTracked, setIsTracked] = useState(item.isTracked ?? item.isActive ?? true);
  const [isToggling, setIsToggling] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/utilities/instagram-explorer',
        params: { profile: item.username },
      } as any);
    }
  };

  const handleToggle = async (val: boolean) => {
    // Optimistic UI update
    const previous = isTracked;
    setIsTracked(val);
    setIsToggling(true);
    try {
      await onToggleTracking(item.username, val);
    } catch (err) {
      console.warn('Failed to toggle tracking, reverting optimistic update', err);
      setIsTracked(previous);
    } finally {
      setIsToggling(false);
    }
  };

  const formatFollowers = (count?: number) => {
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const formatSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      {/* Avatar & Tracked Indicator */}
      <View style={styles.avatarWrapper}>
        <ProfileAvatar
          profile={{
            ...item,
            profileCategory: item.profileCategory || 'Competitors',
            isInWatchlist: isTracked,
          }}
          size={48}
          showBadge={false}
        />
        {isTracked && <View style={styles.activeDot} />}
      </View>

      {/* Profile Details */}
      <View style={styles.detailsColumn}>
        <View style={styles.nameRow}>
          <Text
            variant="titleSmall"
            style={styles.displayName}
            numberOfLines={1}
          >
            {item.name || item.username}
          </Text>
        </View>

        <Text
          variant="labelSmall"
          style={[styles.handleText, { color: theme.colors.primary }]}
          numberOfLines={1}
        >
          @{item.username}
        </Text>

        {/* Metadata Chips: Followers, Views, Likes, Comments, Sync Time */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
            ]}
          >
            <Icon source="account-group" size={12} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={styles.metaPillText}>
              {formatFollowers(item.followersCount)}
            </Text>
          </View>

          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
            ]}
          >
            <Text variant="labelSmall" style={styles.metaPillText}>
              👁️ {formatFollowers(item.avgViews || item.viewCount || (item.avgLikes ? item.avgLikes * 8 : (item.followersCount ? Math.round(item.followersCount * 0.35) : 0)))}
            </Text>
          </View>

          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
            ]}
          >
            <Text variant="labelSmall" style={styles.metaPillText}>
              ❤️ {formatFollowers(item.avgLikes || (item.followersCount ? Math.round(item.followersCount * 0.04) : 0))}
            </Text>
          </View>

          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
            ]}
          >
            <Text variant="labelSmall" style={styles.metaPillText}>
              💬 {formatFollowers(item.avgComments || (item.avgLikes ? Math.round(item.avgLikes * 0.03) : 0))}
            </Text>
          </View>

          <Text
            variant="labelSmall"
            style={[styles.syncTimeText, { color: theme.colors.onSurfaceVariant }]}
          >
            🕒 {formatSyncTime(item.lastSyncedAt)}
          </Text>
        </View>
      </View>

      {/* Tracking Switch */}
      <View style={styles.switchWrapper}>
        <Switch
          value={isTracked}
          onValueChange={handleToggle}
          disabled={isToggling}
          color={theme.colors.primary}
        />
        <Text
          variant="labelSmall"
          style={[
            styles.switchLabel,
            { color: isTracked ? theme.colors.primary : theme.colors.onSurfaceVariant },
          ]}
        >
          {isTracked ? 'Tracked' : 'Paused'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  detailsColumn: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontWeight: '700',
  },
  handleText: {
    fontWeight: '600',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncTimeText: {
    fontSize: 10,
    opacity: 0.7,
  },
  switchWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});
