import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Text, IconButton, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface VideoItemProps {
  item: any;
  onPress?: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}

export const VideoItem: React.FC<VideoItemProps> = ({ 
  item, 
  onPress, 
  onLongPress,
  isSelected,
  selectionMode 
}) => {
  const router = useRouter();

  const getMediaUri = (item: any) => {
    const path = item.storagePath || item.StoragePath;
    if (path) {
      const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL;
      return `${baseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }
    return item.thumbnailUrl || item.mediaUrl;
  };

  return (
    <TouchableOpacity 
      style={[styles.videoItem, isSelected && styles.selectedItem]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <Image 
        source={{ uri: getMediaUri(item) }} 
        style={[styles.thumbnail, isSelected && { opacity: 0.7 }]}
        contentFit="cover"
        transition={200}
      />
      
      {selectionMode && (
        <View style={styles.selectionIndicator}>
          <Icon 
            source={isSelected ? "check-circle" : "circle-outline"} 
            size={24} 
            color={isSelected ? "#6200ee" : "white"} 
          />
        </View>
      )}

      {item.permalink && !selectionMode && (
        <IconButton 
          icon="open-in-new" 
          iconColor="white" 
          size={16} 
          style={styles.openLinkIcon}
          onPress={() => Linking.openURL(item.permalink)}
        />
      )}
      {(item.mediaType === 'VIDEO' || item.mediaType === 'REEL') && (
        <View style={styles.reelBadge}>
          <Icon source="play" size={10} color="white" />
          <Text style={styles.badgeText}> REEL</Text>
        </View>
      )}
      {!selectionMode && (
        <View style={styles.videoStats}>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
              <Text style={styles.statsText}>💬 {(item.commentsCount || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedItem: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    minHeight: 28,
  },
  statsContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row', 
    gap: 6,
  },
  statsText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  reelBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  openLinkIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 0,
    zIndex: 1,
  },
});
