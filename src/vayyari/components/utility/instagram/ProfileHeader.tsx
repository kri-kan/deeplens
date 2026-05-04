import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text, IconButton, Icon, useTheme } from 'react-native-paper';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileHeaderProps {
  profile: any;
  metrics: any;
  onShowSettings: () => void;
  bioExpanded: boolean;
  onToggleBio: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  metrics,
  onShowSettings,
  bioExpanded,
  onToggleBio,
}) => {
  const theme = useTheme();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ProfileAvatar profile={profile} size={80} style={styles.avatar} />
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <View style={styles.nameContainer}>
              <Text variant="titleLarge" style={styles.bold}>{profile.name}</Text>
              {profile.is_own_account && <Icon source="check-decagram" size={20} color={theme.colors.primary} />}
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
        <StatBox label="Followers" value={(profile.followersCount || 0).toLocaleString()} />
        <StatBox label="Posts" value={profile.mediaCount} />
        <StatBox label="Avg. Likes" value={(metrics.avgLikes || 0).toLocaleString()} />
        <StatBox label="Eng. Rate" value={`${metrics.engagementRate?.toFixed(2)}%`} />
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
