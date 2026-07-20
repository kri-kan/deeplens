import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Text, IconButton, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { InstagramMediaType } from '@/services/instagram.service';
import { normalizeData, getMediaUri } from '@/utils/instagram-helpers';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface VideoItemProps {
  item: any; // raw API shape — normalized internally via normalizeData
  onPress?: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}

const VideoItemComponent: React.FC<VideoItemProps> = ({ 
  item: rawItem, 
  onPress, 
  onLongPress,
  isSelected,
  selectionMode 
}) => {
  const router = useRouter();
  const item = normalizeData(rawItem);

  if (!item) return null;

  return (
    <TouchableOpacity 
      style={[styles.videoItem, isSelected && styles.selectedItem]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <Image 
        source={{ uri: getMediaUri(item, 'medium') }} 
        style={[styles.thumbnail, isSelected && { opacity: 0.7 }]}
        contentFit="cover"
        transition={200}
      />
      
      {selectionMode && (
        <View style={[styles.selectionIndicator, { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 0 }]}>
          <Icon 
            source={isSelected ? "check-circle" : "circle-outline"} 
            size={24} 
            color={isSelected ? "#6200ee" : "white"} 
          />
        </View>
      )}

      {!selectionMode && (
        <View style={styles.leftActionsContainer}>
          {item.permalink && (
            <>
              <IconButton 
                icon="open-in-new" 
                iconColor="white" 
                size={16} 
                style={styles.actionIcon}
                onPress={() => Linking.openURL(item.permalink || '')}
              />
              <IconButton 
                icon="link-variant" 
                iconColor="white" 
                size={16} 
                style={styles.actionIcon}
                onPress={async () => {
                  await Clipboard.setStringAsync(item.permalink || '');
                }}
              />
            </>
          )}
          {item.youtubeUrl && (
            <IconButton 
              icon="youtube" 
              iconColor="#FF0000" 
              size={20} 
              style={styles.youtubeActionIcon}
              onPress={() => Linking.openURL(item.youtubeUrl || '')}
            />
          )}
        </View>
      )}

      {item.productCode && !selectionMode && (
        <View style={styles.productCodeContainer}>
          <Text style={styles.productCodeText}>{item.productCode}</Text>
        </View>
      )}

      {item.mediaType === InstagramMediaType.VIDEO && (
          <View style={styles.centerPlayButton}>
            <Icon source="play" size={16} color="white" />
          </View>
        )}

      {!selectionMode && (
        <View style={styles.videoStats}>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
              <Text style={styles.statsText}>💬 {(item.commentCount || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const VideoItem = React.memo(VideoItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode
  );
});

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
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  leftActionsContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 32, // End just above the bottom stats tray
    zIndex: 10,
    gap: 4,
  },
  actionIcon: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 0,
    width: 24,
    height: 24,
  },
  youtubeActionIcon: {
    backgroundColor: 'transparent',
    margin: 0,
    width: 24,
    height: 24,
    marginTop: -4, // Adjust for larger icon visual alignment
  },
  productCodeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  productCodeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    elevation: 2, // Helps on Android for shadow rendering
  },
});
