import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { ProfileAvatar } from './ProfileAvatar';

import { normalizeProfile } from '@/utils/instagram-helpers';
import type { InstagramProfile, ProfileMetrics } from '@/services/instagram.service';

interface ProfileHeaderProps {
  profile: InstagramProfile | any; // accepts raw API shape, normalized internally
  metrics: ProfileMetrics | null;
  onShowSettings: () => void;
  bioExpanded: boolean;
  onToggleBio: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile: rawProfile,
  metrics,
  onShowSettings,
  bioExpanded,
  onToggleBio,
}) => {
  const theme = useTheme();
  const profile = normalizeProfile(rawProfile);
  
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
              <Text variant="titleLarge" style={styles.bold}>{profile.name}</Text>
            </View>
            <IconButton icon="cog" size={20} style={styles.settingsIcon} onPress={onShowSettings} />
          </View>
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

      <View style={styles.statsRow}>
        <StatBox label="Followers" value={(profile?.followersCount || 0).toLocaleString()} />
        <StatBox label="Posts" value={profile?.mediaCount || 0} />
        <StatBox label="Avg. Likes" value={(metrics?.avgLikes || 0).toLocaleString()} />
        <StatBox label="Eng. Rate" value={metrics?.engagementRate !== undefined ? `${metrics.engagementRate.toFixed(2)}%` : '0.00%'} />
      </View>
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 4,
  },
  statBox: {
    alignItems: 'center',
  },
});
