import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { normalizeProfile, getProfilePicUri } from '@/utils/instagram-helpers';
import { getSearchApiUrl } from '@/utils/api-config';


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
  const [triedFallback, setTriedFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  const baseUrl = getSearchApiUrl() || '';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const storageUri = profile.storagePath 
    ? `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(profile.storagePath)}` 
    : null;
    
  let remoteFallbackUri = profile.profilePictureUrl || null;
  if (remoteFallbackUri && remoteFallbackUri.startsWith('/') && !remoteFallbackUri.startsWith('//')) {
    remoteFallbackUri = `${cleanBaseUrl}${remoteFallbackUri}`;
  }

  // Reset error states when profile changes
  React.useEffect(() => {
    setTriedFallback(false);
    setHasError(false);
  }, [profile.id, profile.username, profile.storagePath, profile.profilePictureUrl]);

  let activeUri: string | null = null;
  if (!hasError) {
    if (!triedFallback && storageUri) {
      activeUri = storageUri;
    } else if (remoteFallbackUri) {
      activeUri = remoteFallbackUri;
    }
  }

  const handleImageError = () => {
    if (!triedFallback && storageUri && remoteFallbackUri && storageUri !== remoteFallbackUri) {
      setTriedFallback(true);
    } else {
      setHasError(true);
    }
  };

  const initials = (profile?.username || profile?.name || '??').substring(0, 2).toUpperCase();

  const inWatchlist = profile.isInWatchlist;
  const active = profile.isActive !== false; // Default to true if undefined

  const badgeConfig = {
    icon: (inWatchlist && active) ? "check-circle" : "minus-circle",
    color: profile.profileCategory === 'My Business' ? "#4CAF50" : 
           profile.profileCategory === 'Competitors' ? "#F44336" : "#2196F3"
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.surfaceVariant }]}>
        {activeUri ? (
          <Image 
            source={{ uri: activeUri }} 
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={handleImageError}
          />
        ) : (
          <Avatar.Text 
            size={size} 
            label={initials} 
            style={[styles.fallback, { borderRadius: size / 2, backgroundColor: theme.colors.surfaceVariant }]}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
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
