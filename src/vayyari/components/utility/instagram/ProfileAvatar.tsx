import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { normalizeProfile } from '@/utils/instagram-helpers';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


interface ProfileAvatarProps {
  profile: any;
  size?: number;
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  profile: rawProfile, 
  size = 60, 
  showBadge = false,
  style 
}) => {
  const theme = useTheme();
  const profile = normalizeProfile(rawProfile);

  const getProfilePicUri = (p: any) => {
    if (!p) return null;
    const path = p.storagePath;
    if (path) {
      const baseUrl = getSearchApiUrl();
      return `${baseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }
    return p.profilePictureUrl;
  };

  const uri = getProfilePicUri(profile);
  const initials = profile?.username?.substring(0, 2).toUpperCase() || '??';

  const inWatchlist = profile.isInWatchlist;
  const active = profile.isActive !== false; // Default to true if undefined

  const badgeConfig = {
    icon: (inWatchlist && active) ? "check-circle" : "minus-circle",
    color: profile.isOwnAccount ? "#4CAF50" : "#2196F3"
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image 
            source={{ uri }} 
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <Avatar.Text 
            size={size} 
            label={initials} 
            style={[styles.fallback, { borderRadius: size / 2 }]}
          />
        )}
      </View>
      
      {profile.isPinned && (
        <View style={[styles.badge, { 
          top: -4, 
          left: -4, 
          backgroundColor: theme.colors.onSurface,
          borderRadius: 12,
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }]}>
          <MaterialCommunityIcons name="pin" color={theme.colors.surface} size={16} style={{ transform: [{ rotate: '45deg' }] }} />
        </View>
      )}

      {showBadge && (
        <View style={[styles.badge, { 
          bottom: -1, 
          right: -1, 
          backgroundColor: 'white',
          borderRadius: 10,
          width: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }]}>
          <MaterialCommunityIcons 
            name={badgeConfig.icon as any} 
            color={badgeConfig.color}
            size={18}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#e0e0e0',
  },
  badge: {
    position: 'absolute',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  }
});
