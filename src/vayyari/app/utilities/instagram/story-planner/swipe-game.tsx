import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  Animated, 
  PanResponder, 
  Dimensions, 
  Modal, 
  FlatList 
} from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryPostingHistory, InstagramPost } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

export default function StorySwipeGameScreen() {
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [pendingSwipes, setPendingSwipes] = useState<StoryPostingHistory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Full Screen Carousel Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StoryPostingHistory | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  // Animation & Refs
  const position = useRef(new Animated.ValueXY()).current;
  const flatListRef = useRef<FlatList>(null);

  // Tinder card swipe interpolation definitions
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate }
    ]
  };

  const likeOpacity = position.x.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp'
  });

  // Load Pending Swipe Cards
  const loadPendingCards = async () => {
    setLoading(true);
    try {
      const cards = await wrapInSpan('StorySwipeGameScreen: getPendingSwipeCards', () => 
        instagramService.getPendingSwipeCards()
      );
      setPendingSwipes(cards);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load swipe cards', error);
      Alert.alert('Error', 'Failed to load swipe cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingCards();
  }, []);

  // PanResponder to handle tinder swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take control of gesture if horizontal or vertical movement is larger than threshold (10px)
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          // Snap back to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  const handleSwipeAction = (direction: 'left' | 'right') => {
    if (currentIndex >= pendingSwipes.length) return;

    const currentCard = pendingSwipes[currentIndex];
    
    // Optimistic index update and position reset
    setCurrentIndex(prev => prev + 1);
    position.setValue({ x: 0, y: 0 });

    wrapInSpan('StorySwipeGameScreen: submitSwipes', () => 
      instagramService.submitSwipes([
        { historyId: currentCard.id, direction }
      ])
    ).catch(error => {
      console.error('Failed to submit swipe response', error);
      Alert.alert('Error', 'Failed to save swipe response.');
    });
  };

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 120 : -SCREEN_WIDTH - 120;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: true
    }).start(() => handleSwipeAction(direction));
  };

  const handleCardPress = (card: StoryPostingHistory) => {
    setSelectedGroup(card);
    setActiveCarouselIndex(0);
    setShowModal(true);
  };

  const activeCard = currentIndex < pendingSwipes.length ? pendingSwipes[currentIndex] : null;
  const nextCard = currentIndex + 1 < pendingSwipes.length ? pendingSwipes[currentIndex + 1] : null;

  const currentActivePost = selectedGroup?.posts && selectedGroup.posts[activeCarouselIndex]
    ? selectedGroup.posts[activeCarouselIndex]
    : null;

  // Render Card layout inside the stack
  const renderCardContent = (card: StoryPostingHistory, latestPost: InstagramPost | null) => {
    return (
      <View style={[styles.cardInner, { padding: 0 }]}>
        {latestPost ? (
          <View style={[StyleSheet.absoluteFillObject, { borderRadius: 16, overflow: 'hidden' }]}>
            <Image 
              source={{ uri: getMediaUri(latestPost, 'large') }} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.fallbackContainer, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 16 }]}>
            <IconButton icon="image-off-outline" size={40} iconColor={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>No posts in this group</Text>
          </View>
        )}

        <View style={styles.overlay}>
          {/* Header Info */}
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" numberOfLines={1} style={[styles.bold, { color: 'white' }]}>
              {card.groupName}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 2 }}>
              Posted on @{card.targetUsername}
            </Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, marginTop: 1 }}>
              {new Date(card.postedAt).toLocaleString()}
            </Text>
          </View>

          {latestPost && (
            <View style={[styles.latestBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.latestBadgeText}>LATEST POST</Text>
            </View>
          )}

          {/* Footer / Caption */}
          <View style={styles.cardFooter}>
            {latestPost?.caption ? (
              <>
                <Text variant="labelSmall" style={{ color: 'white', fontWeight: 'bold' }}>
                  Latest Caption:
                </Text>
                <Text variant="bodySmall" numberOfLines={2} style={[styles.captionText, { color: 'white' }]}>
                  {latestPost.caption}
                </Text>
              </>
            ) : (
              <Text variant="bodySmall" style={[styles.captionText, { color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }]}>
                No caption available.
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getLatestPost = (posts: InstagramPost[]) => {
    if (!posts || posts.length === 0) return null;
    const sorted = [...posts].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    return sorted[0];
  };

  return (
    <ScreenWrapper title="Swipe Game" subtitle="Feedback Swipe Deck" withScrollView={false}>
      <Stack.Screen options={{ headerTitle: 'Swipe Game' }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12 }}>Loading cards...</Text>
        </View>
      ) : !activeCard ? (
        <View style={styles.center}>
          <IconButton icon="trophy-outline" size={48} iconColor={theme.colors.secondary} style={{ opacity: 0.8 }} />
          <Text variant="bodyLarge" style={styles.bold}>Swipe Deck Empty!</Text>
          <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
            You have swiped all posted stories older than 24 hours.
          </Text>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <Text variant="labelSmall" style={styles.counterText}>
            Card {currentIndex + 1} of {pendingSwipes.length}
          </Text>

          {/* Swipe Stack Area */}
          <View style={styles.stackContainer}>
            {nextCard && (
              <Animated.View 
                style={[
                  styles.cardCanvas, 
                  { 
                    backgroundColor: theme.colors.surface,
                    transform: [{ scale: nextCardScale }],
                    zIndex: 1,
                    opacity: 0.9,
                  }
                ]}
              >
                {renderCardContent(nextCard, getLatestPost(nextCard.posts))}
              </Animated.View>
            )}

            {activeCard && (
              <Animated.View 
                {...panResponder.panHandlers}
                style={[
                  styles.cardCanvas, 
                  cardStyle,
                  { 
                    backgroundColor: theme.colors.surface,
                    zIndex: 2 
                  }
                ]}
              >
                <TouchableOpacity 
                  activeOpacity={0.95} 
                  onPress={() => handleCardPress(activeCard)}
                  style={{ flex: 1 }}
                >
                  {renderCardContent(activeCard, getLatestPost(activeCard.posts))}

                  {/* LIKE Badge */}
                  <Animated.View style={[styles.badgeContainer, styles.likeBadge, { opacity: likeOpacity }]}>
                    <Text style={styles.badgeTextLike}>LIKE</Text>
                  </Animated.View>

                  {/* NOPE Badge */}
                  <Animated.View style={[styles.badgeContainer, styles.nopeBadge, { opacity: nopeOpacity }]}>
                    <Text style={styles.badgeTextNope}>NOPE</Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Swipe Action Buttons */}
          <View style={styles.controlsRow}>
            {/* Left/Dislike Action */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.dislikeButton]} 
              onPress={() => forceSwipe('left')}
              activeOpacity={0.8}
            >
              <IconButton icon="close" size={32} iconColor="#ff4d4d" style={{ margin: 0 }} />
            </TouchableOpacity>

            {/* Right/Like Action */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.likeButton]} 
              onPress={() => forceSwipe('right')}
              activeOpacity={0.8}
            >
              <IconButton icon="heart" size={32} iconColor="#00e676" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full-Screen Carousel Modal */}
      <Modal 
        visible={showModal} 
        animationType="slide" 
        transparent={false} 
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: '#121212' }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ color: 'white', fontWeight: 'bold' }} numberOfLines={1}>
                {selectedGroup?.groupName}
              </Text>
              <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>
                Posted on @{selectedGroup?.targetUsername}
              </Text>
            </View>
            <IconButton 
              icon="close" 
              iconColor="white" 
              size={24} 
              onPress={() => setShowModal(false)} 
              style={{ margin: 0 }}
            />
          </View>

          {/* Main Carousel Swipeable Media Viewer */}
          <FlatList
            ref={flatListRef}
            data={selectedGroup?.posts || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveCarouselIndex(index);
            }}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.carouselItemContainer}>
                {getMediaUri(item) ? (
                  <Image 
                    source={{ uri: getMediaUri(item, 'large') }} 
                    style={styles.carouselImage} 
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.carouselFallback}>
                    <IconButton icon="image-off" size={64} iconColor="rgba(255,255,255,0.3)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>No image available</Text>
                  </View>
                )}
              </View>
            )}
          />

          {/* Page Counter */}
          {selectedGroup?.posts && selectedGroup.posts.length > 0 && (
            <Text style={styles.modalPageIndicator}>
              {activeCarouselIndex + 1} of {selectedGroup.posts.length}
            </Text>
          )}

          {/* Horizontal thumbnail navigation strip */}
          <View style={styles.thumbnailStripContainer}>
            <FlatList
              data={selectedGroup?.posts || []}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `thumb-${item.id}`}
              contentContainerStyle={styles.thumbnailStripContent}
              renderItem={({ item, index }) => {
                const isActive = index === activeCarouselIndex;
                return (
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveCarouselIndex(index);
                      flatListRef.current?.scrollToIndex({ index, animated: true });
                    }}
                    style={[
                      styles.thumbnailWrapper,
                      isActive && { borderColor: theme.colors.primary, borderWidth: 2.5 }
                    ]}
                  >
                    <Image 
                      source={{ uri: getMediaUri(item, 'medium') }} 
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Post Metrics and Caption */}
          <View style={[styles.modalMetadataContainer, { backgroundColor: '#1e1e1e' }]}>
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatItem}>
                <IconButton icon="heart" size={18} iconColor="#ff4d4d" style={{ margin: 0, padding: 0 }} />
                <Text style={styles.modalStatText}>{currentActivePost?.likeCount ?? 0} Likes</Text>
              </View>
              <View style={styles.modalStatItem}>
                <IconButton icon="comment" size={18} iconColor="#00e676" style={{ margin: 0, padding: 0 }} />
                <Text style={styles.modalStatText}>{currentActivePost?.commentCount ?? 0} Comments</Text>
              </View>
              <Text style={styles.modalDateText}>
                {currentActivePost?.timestamp ? new Date(currentActivePost.timestamp).toLocaleDateString() : ''}
              </Text>
            </View>

            <ScrollView style={styles.modalCaptionScroll} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.modalCaptionText}>
                {currentActivePost?.caption || 'No caption available.'}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  bold: {
    fontWeight: 'bold'
  },
  gameContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  counterText: {
    alignSelf: 'center',
    opacity: 0.6,
    marginBottom: 8
  },
  stackContainer: {
    flex: 1,
    position: 'relative',
    marginVertical: 8
  },
  cardCanvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  cardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  cardHeader: {
    marginBottom: 8
  },
  imageContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
    backgroundColor: '#eaeaea'
  },
  cardPreviewImage: {
    width: '100%',
    height: '100%'
  },
  latestBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    elevation: 2
  },
  latestBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardFooter: {
    marginTop: 8,
    minHeight: 50
  },
  captionText: {
    marginTop: 4,
    opacity: 0.85
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 3,
    zIndex: 10
  },
  likeBadge: {
    left: 24,
    borderColor: '#00e676',
    transform: [{ rotate: '-15deg' }]
  },
  nopeBadge: {
    right: 24,
    borderColor: '#ff4d4d',
    transform: [{ rotate: '15deg' }]
  },
  badgeTextLike: {
    color: '#00e676',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  badgeTextNope: {
    color: '#ff4d4d',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginVertical: 12
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white'
  },
  dislikeButton: {
    borderColor: '#ff4d4d',
    borderWidth: 1.5
  },
  likeButton: {
    borderColor: '#00e676',
    borderWidth: 1.5
  },

  // Modal styling
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c'
  },
  carouselItemContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center'
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: '100%',
    maxHeight: SCREEN_WIDTH * 1.3
  },
  carouselFallback: {
    width: SCREEN_WIDTH,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalPageIndicator: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 8
  },
  thumbnailStripContainer: {
    height: 70,
    marginVertical: 8
  },
  thumbnailStripContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8
  },
  thumbnailWrapper: {
    width: 50,
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%'
  },
  modalMetadataContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    height: SCREEN_WIDTH * 0.5,
    justifyContent: 'flex-start'
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalStatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4
  },
  modalDateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginLeft: 'auto'
  },
  modalCaptionScroll: {
    flex: 1
  },
  modalCaptionText: {
    color: '#eaeaea',
    fontSize: 13,
    lineHeight: 18
  }
});
