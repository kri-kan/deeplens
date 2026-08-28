import React from 'react';
import { StyleSheet, View, Image, ScrollView, Modal } from 'react-native';
import { Surface, Text, Button, IconButton, TouchableRipple, Icon, useTheme } from 'react-native-paper';
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

          {/* Action Tiles (Chevron List Item Approach) */}
          <View style={styles.actionContainer}>
            {/* Create Order Tile */}
            <Surface
              style={[
                styles.actionTileSurface,
                {
                  backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.elevation.level1,
                  borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.1)',
                },
              ]}
              elevation={1}
            >
              <TouchableRipple
                onPress={onCreateOrder}
                style={styles.actionTileRipple}
                rippleColor="rgba(0, 0, 0, 0.08)"
              >
                <View style={styles.actionTileContent}>
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: (theme.colors as any).primaryContainer || '#EADDFF',
                      },
                    ]}
                  >
                    <Icon
                      source="cart-plus"
                      size={22}
                      color={(theme.colors as any).onPrimaryContainer || theme.colors.primary}
                    />
                  </View>

                  <View style={styles.tileTextContainer}>
                    <Text variant="titleMedium" style={[styles.tileTitle, { color: theme.colors.onSurface }]}>
                      Create Order
                    </Text>
                    <Text variant="bodySmall" style={[styles.tileSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                      Start a new customer order with this staged media
                    </Text>
                  </View>

                  <Icon
                    source="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableRipple>
            </Surface>

            {/* Create Product / Add to Catalog Tile */}
            <Surface
              style={[
                styles.actionTileSurface,
                {
                  backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.elevation.level1,
                  borderColor: (theme.colors as any).outlineVariant || 'rgba(0,0,0,0.1)',
                },
              ]}
              elevation={1}
            >
              <TouchableRipple
                onPress={onCreateProduct}
                style={styles.actionTileRipple}
                rippleColor="rgba(0, 0, 0, 0.08)"
              >
                <View style={styles.actionTileContent}>
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: (theme.colors as any).secondaryContainer || '#E8DEF8',
                      },
                    ]}
                  >
                    <Icon
                      source="tag-plus-outline"
                      size={22}
                      color={(theme.colors as any).onSecondaryContainer || theme.colors.secondary}
                    />
                  </View>

                  <View style={styles.tileTextContainer}>
                    <Text variant="titleMedium" style={[styles.tileTitle, { color: theme.colors.onSurface }]}>
                      Add to Catalog / Create Product
                    </Text>
                    <Text variant="bodySmall" style={[styles.tileSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                      Create a new product listing in your catalog
                    </Text>
                  </View>

                  <Icon
                    source="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableRipple>
            </Surface>

            {/* Discard & Cancel Button */}
            <Button
              mode="text"
              icon="trash-can-outline"
              onPress={onDiscard}
              textColor={theme.colors.error}
              style={styles.discardButton}
            >
              Discard & Cancel
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
  actionTileSurface: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionTileRipple: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionTileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tileTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  tileTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  tileSubtitle: {
    marginTop: 2,
    lineHeight: 16,
  },
  discardButton: {
    marginTop: 4,
  },
});

