import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Text, IconButton, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface VideoItemProps {
  item: any;
}

export const VideoItem: React.FC<VideoItemProps> = ({ item }) => {
  const getMediaUri = (item: any) => {
    const path = item.storagePath || item.StoragePath;
    if (path) {
      return `http://192.168.0.170:5000/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }
    return item.thumbnailUrl || item.mediaUrl;
  };

  return (
    <View style={styles.videoItem}>
      <Image 
        source={{ uri: getMediaUri(item) }} 
        style={styles.thumbnail}
        contentFit="cover"
        transition={200}
      />
      {item.permalink && (
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
      <View style={styles.videoStats}>
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
            <Text style={styles.statsText}>💬 {(item.commentsCount || 0).toLocaleString()}</Text>
          </View>
          <IconButton 
            icon="link-variant" 
            iconColor="white" 
            size={14} 
            style={styles.linkIcon}
            onPress={async () => {
              if (item.permalink) {
                await Clipboard.setStringAsync(item.permalink);
              }
            }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
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
  linkIcon: {
    margin: 0,
  },
});
