import React from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Surface, Text, IconButton, useTheme, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SharedMediaItem, useShareIntentContext } from '@/context/ShareIntentContext';

interface SharedMediaPreviewProps {
  mediaItems: SharedMediaItem[];
}

export const SharedMediaPreview: React.FC<SharedMediaPreviewProps> = ({ mediaItems }) => {
  const theme = useTheme();
  const { removeSharedMedia, addSharedMedia } = useShareIntentContext();

  const handlePickAdditionalImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newItems: SharedMediaItem[] = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName || undefined,
      }));
      addSharedMedia(newItems);
    }
  };

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton icon="image-multiple" size={20} iconColor={theme.colors.secondary} style={styles.icon} />
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Shared Media ({mediaItems.length})
          </Text>
        </View>
        <Button mode="text" compact onPress={handlePickAdditionalImages} labelStyle={{ color: theme.colors.secondary, fontWeight: 'bold' }}>
          + Add More
        </Button>
      </View>

      {mediaItems.length === 0 ? (
        <TouchableOpacity style={[styles.emptyState, { borderColor: theme.colors.outlineVariant }]} onPress={handlePickAdditionalImages}>
          <IconButton icon="cloud-upload-outline" size={32} iconColor={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No images attached yet. Tap to select media.
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
          {mediaItems.map((item, index) => (
            <View key={`${item.uri}-${index}`} style={styles.thumbnailContainer}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={[styles.removeBadge, { backgroundColor: theme.colors.error }]}
                onPress={() => removeSharedMedia(index)}
              >
                <IconButton icon="close" size={12} iconColor="#ffffff" style={styles.removeIcon} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    margin: 0,
    marginRight: 6,
  },
  title: {
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  removeIcon: {
    margin: 0,
    padding: 0,
  },
});
