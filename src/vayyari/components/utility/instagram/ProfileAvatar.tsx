import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from 'react-native-paper';

interface ProfileAvatarProps {
  profile: {
    username: string;
    profilePictureUrl?: string;
    storagePath?: string;
    StoragePath?: string; // Resilience for backend casing
  };
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ profile, size = 60, style }) => {
  const getProfilePicUri = (p: any) => {
    const path = p.storagePath || p.StoragePath;
    if (path) {
      const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL;
      return `${baseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }
    return p.profilePictureUrl;
  };

  const uri = getProfilePicUri(profile);
  const initials = profile.username?.substring(0, 2).toUpperCase() || '??';

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#e0e0e0',
  }
});
