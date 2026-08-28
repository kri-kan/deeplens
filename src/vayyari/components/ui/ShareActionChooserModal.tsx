import React from 'react';
import { StyleSheet, View, Image, ScrollView, Modal, Dimensions } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme } from 'react-native-paper';
import { SharedMediaItem } from '@/context/ShareIntentContext';

interface ShareActionChooserModalProps {
  visible: boolean;
  mediaItems: SharedMediaItem[];
  sessionId?: string;
  onCreateOrder: () => void;
  onCreateProduct: () => void;
  onDiscard: () => void;
}

export const ShareActionChooserModal: React.FC<ShareActionChooserModalProps> = ({
  visible,
  mediaItems,
  sessionId,
  onCreateOrder,
  onCreateProduct,
  onDiscard,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDiscard}
    >
      <View style={styles.overlay}>
        <Surface
          style={[
            styles.sheet,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={5}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconButton icon="share-variant" size={24} iconColor={theme.colors.primary} style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  Shared Media Received
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {mediaItems.length} item{mediaItems.length === 1 ? '' : 's'} staged locally
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDiscard} />
          </View>

          {/* Media Preview Carousel */}
          <View style={styles.previewContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {mediaItems.map((item, idx) => (
                <View key={`${item.uri}-${idx}`} style={styles.mediaCard}>
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                  <View style={styles.mediaBadge}>
                    <Text style={styles.badgeText}>#{idx + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <Text variant="bodyMedium" style={[styles.instruction, { color: theme.colors.onSurfaceVariant }]}>
            Choose what you would like to create with this media:
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              icon="cart-plus"
              onPress={onCreateOrder}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              Create Order
            </Button>

            <Button
              mode="outlined"
              icon="tag-plus-outline"
              onPress={onCreateProduct}
              textColor={theme.colors.primary}
              style={[styles.actionButton, { borderColor: theme.colors.primary, borderWidth: 1.5 }]}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              Create Product / Add to Catalog
            </Button>

            <Button
              mode="text"
              icon="trash-can-outline"
              onPress={onDiscard}
              textColor={theme.colors.error}
              style={styles.discardButton}
            >
              Discard Media
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    margin: 0,
  },
  title: {
    fontWeight: 'bold',
  },
  previewContainer: {
    marginVertical: 8,
  },
  carouselContent: {
    gap: 12,
    paddingVertical: 6,
  },
  mediaCard: {
    position: 'relative',
    width: 110,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  instruction: {
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 14,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  discardButton: {
    marginTop: 4,
  },
});
