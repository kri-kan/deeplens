import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, IconButton, Modal, Portal, useTheme, Button, Avatar } from 'react-native-paper';
import { instagramService, InstagramComment } from '../../../services/instagram.service';

interface InstagramCommentsModalProps {
  visible: boolean;
  onDismiss: () => void;
  postId: string;
  onSyncPress: () => void;
  commentCount: number;
}

export const InstagramCommentsModal: React.FC<InstagramCommentsModalProps> = ({
  visible,
  onDismiss,
  postId,
  onSyncPress,
  commentCount,
}) => {
  const theme = useTheme();
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadComments = async (showLoadingIndicator = false) => {
    if (!postId) return;
    try {
      if (showLoadingIndicator) setIsLoading(true);
      const data = await instagramService.getPostComments(postId);
      setComments(data || []);
    } catch (err) {
      console.error('Failed to load post comments', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible && postId) {
      loadComments(true);
    }
  }, [visible, postId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadComments(false);
  };

  // Generate a gorgeous pastel/vibrant HSL color from username string
  const getAvatarColor = (username: string) => {
    let hash = 0;
    const name = username || 'Anonymous';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 42%)`;
  };

  // Format relative time (e.g., 2d, 1w)
  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const posted = new Date(dateStr);
    const diffMs = now.getTime() - posted.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    const diffWk = Math.floor(diffDay / 7);
    return `${diffWk}w`;
  };

  const renderCommentItem = ({ item }: { item: InstagramComment }) => {
    const username = item.username || 'anonymous';
    const initial = username.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(username);

    return (
      <View style={styles.commentItem}>
        <Avatar.Text
          size={36}
          label={initial}
          style={[styles.avatar, { backgroundColor: avatarColor }]}
          labelStyle={styles.avatarText}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text variant="labelLarge" style={styles.username}>
              {username}
            </Text>
            <Text variant="bodySmall" style={styles.timestamp}>
              {formatRelativeTime(item.postedAt)}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.commentText}>
            {item.commentText}
          </Text>
          {item.likeCount > 0 && (
            <View style={styles.likeContainer}>
              <IconButton icon="heart" size={12} iconColor="#aaa" style={styles.likeIcon} />
              <Text variant="bodySmall" style={styles.likeCount}>
                {item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.elevation.level1 }]}
      >
        {/* Top Drag/Slide Handle aesthetic */}
        <TouchableOpacity style={styles.handleContainer} onPress={onDismiss} activeOpacity={0.7}>
          <View style={styles.handle} />
        </TouchableOpacity>

        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={styles.title}>
              Comments
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
              {comments.length} synced ({commentCount} total)
            </Text>
          </View>
          <IconButton icon="close" size={24} onPress={onDismiss} style={styles.closeButton} />
        </View>

        {/* Body content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.outline }}>
              Loading comments...
            </Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconButton icon="comment-text-outline" size={48} iconColor={theme.colors.outline} />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No comments synced yet
            </Text>
            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.outline }]}>
              Synchronize comments from Instagram to read customer reviews, prices, and queries here.
            </Text>
            <Button
              mode="contained"
              icon="comment-sync"
              onPress={onSyncPress}
              style={styles.syncButton}
              labelStyle={styles.syncButtonLabel}
            >
              Sync Comments Now
            </Button>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    minHeight: '45%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: 'rgba(128,128,128,0.25)',
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '500',
  },
  closeButton: {
    margin: 0,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  username: {
    fontWeight: '600',
  },
  timestamp: {
    opacity: 0.5,
  },
  commentText: {
    lineHeight: 20,
    opacity: 0.9,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  likeIcon: {
    margin: 0,
    padding: 0,
    width: 14,
    height: 14,
  },
  likeCount: {
    opacity: 0.5,
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    minHeight: 300,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  syncButton: {
    borderRadius: 24,
    paddingHorizontal: 8,
  },
  syncButtonLabel: {
    fontWeight: '700',
  },
});
