import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { InstagramPost } from '@/services/instagram.service';
import { getMediaUri, isVideo } from '@/utils/instagram-helpers';
import { VisualLensButton } from '@/components/tamagui-ui/atoms/VisualLensButton';
import { InstagramVideoPlayer } from './InstagramVideoPlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstagramMediaFocusModalProps {
  visible: boolean;
  onClose: () => void;
  post: InstagramPost;
  mediaList: InstagramPost[];
  initialIndex?: number;
  onOpenDedicatedLens?: (selectedMedia: InstagramPost) => void;
  onPostUpdated?: (updatedPost: InstagramPost) => void;
}

export const InstagramMediaFocusModal: React.FC<InstagramMediaFocusModalProps> = ({
  visible,
  onClose,
  post,
  mediaList,
  initialIndex = 0,
  onOpenDedicatedLens,
  onPostUpdated,
}) => {
  const insets = useSafeAreaInsets();

  const items = mediaList.length > 0 ? mediaList : [post];
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Video playback states inside focus modal
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const currentMedia = items[activeIndex] || post;
  const currentMediaUri = getMediaUri(currentMedia, 'large') || currentMedia.thumbnailUrl || currentMedia.mediaUrl;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Control Bar: Top-Left Neon Lens Button, Center Counter, Top-Right Close Button */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          {/* Top-Left: Neon Lens Icon Button */}
          <VisualLensButton
            imageUri={currentMediaUri}
            storagePath={currentMedia.storagePath}
            postId={post.id}
            mediaId={currentMedia.id && currentMedia.id !== post.id ? currentMedia.id : undefined}
            onBeforeNavigate={onClose}
            size={44}
            iconSize={22}
            variant="neon"
          />

          {/* Center: Image Counter Pill */}
          {items.length > 1 ? (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {items.length}
              </Text>
            </View>
          ) : (
            <View style={{ width: 44 }} />
          )}

          {/* Top-Right: Dismiss Close Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close focus preview"
            style={styles.glassButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Icon source="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Media FlatList / Viewer */}
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          data={items}
          keyExtractor={(m, idx) => m.id || `focus_${idx}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(idx);
          }}
          renderItem={({ item: media, index }) => {
            const isMediaVideo = isVideo(media);
            const mediaUri = getMediaUri(media, 'large') || media.thumbnailUrl || media.mediaUrl;

            return (
              <View style={[styles.mediaSlide, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
                {isMediaVideo ? (
                  <InstagramVideoPlayer
                    media={media}
                    width={SCREEN_WIDTH}
                    getMediaHeight={() => SCREEN_HEIGHT * 0.75}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    volume={volume}
                    setVolume={setVolume}
                    isPlaying={isPlaying}
                    isActive={index === activeIndex}
                  />
                ) : (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.fullscreenImage}
                    contentFit="contain"
                    transition={200}
                  />
                )}
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  mediaSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  neonLensButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#06B6D4',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
});
