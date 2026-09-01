import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Surface, Text, TextInput, IconButton, useTheme, Button, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SharedMediaItem, useShareIntentContext } from '@/context/ShareIntentContext';
import { OrderItemDraft } from '@/types/orders';

interface SharedMediaItemTaggerProps {
  mediaItems: SharedMediaItem[];
  itemDrafts: OrderItemDraft[];
  onUpdateDraft: (id: string, updates: Partial<OrderItemDraft>) => void;
  onRemoveItem: (id: string, mediaIndex?: number) => void;
}

export const SharedMediaItemTagger: React.FC<SharedMediaItemTaggerProps> = ({
  mediaItems,
  itemDrafts,
  onUpdateDraft,
  onRemoveItem,
}) => {
  const theme = useTheme();
  const { addSharedMedia, removeSharedMedia } = useShareIntentContext();

  const handlePickAdditionalImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newItems: SharedMediaItem[] = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
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
            Shared Media Items ({mediaItems.length})
          </Text>
        </View>
        <Button
          mode="text"
          compact
          onPress={handlePickAdditionalImages}
          labelStyle={{ color: theme.colors.secondary, fontWeight: 'bold' }}
        >
          + Add Media
        </Button>
      </View>

      {itemDrafts.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyState, { borderColor: theme.colors.outlineVariant }]}
          onPress={handlePickAdditionalImages}
        >
          <IconButton icon="cloud-upload-outline" size={32} iconColor={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No media staged from WhatsApp/Instagram share. Tap to pick files.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.itemsList}>
          {itemDrafts.map((draft, idx) => (
            <Surface
              key={draft.id}
              style={[styles.itemCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
              elevation={0}
            >
              <View style={styles.itemHeader}>
                <View style={styles.thumbnailContainer}>
                  {draft.mediaUri ? (
                    <Image source={{ uri: draft.mediaUri }} style={styles.thumbnail} />
                  ) : (
                    <View style={[styles.thumbnail, styles.placeholderThumb]}>
                      <IconButton icon="image" size={24} />
                    </View>
                  )}
                  <Chip compact style={styles.indexBadge} textStyle={{ fontSize: 10, fontWeight: 'bold' }}>
                    #{idx + 1}
                  </Chip>
                </View>

                <View style={styles.itemFields}>
                  <TextInput
                    label="Product SKU / Code"
                    value={draft.productCode || ''}
                    onChangeText={val => onUpdateDraft(draft.id, { productCode: val })}
                    mode="outlined"
                    dense
                    style={styles.fieldInput}
                    placeholder="e.g. SLK-1049"
                  />

                  <View style={styles.rowInputs}>
                    <TextInput
                      label="Unit Price (₹)"
                      value={draft.unitPrice > 0 ? String(draft.unitPrice) : ''}
                      onChangeText={val => {
                        const price = parseFloat(val) || 0;
                        onUpdateDraft(draft.id, {
                          unitPrice: price,
                          subtotal: price * (draft.quantity || 1),
                        });
                      }}
                      keyboardType="numeric"
                      mode="outlined"
                      dense
                      style={[styles.fieldInput, { flex: 1 }]}
                    />

                    <TextInput
                      label="Qty"
                      value={String(draft.quantity || 1)}
                      onChangeText={val => {
                        const qty = parseInt(val, 10) || 1;
                        onUpdateDraft(draft.id, {
                          quantity: qty,
                          subtotal: (draft.unitPrice || 0) * qty,
                        });
                      }}
                      keyboardType="number-pad"
                      mode="outlined"
                      dense
                      style={[styles.fieldInput, { width: 70 }]}
                    />
                  </View>

                  <View style={styles.subtotalRow}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Subtotal: <Text style={{ fontWeight: 'bold', color: theme.colors.secondary }}>₹{draft.subtotal || (draft.unitPrice * draft.quantity)}</Text>
                    </Text>
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={theme.colors.error}
                      onPress={() => onRemoveItem(draft.id, idx)}
                    />
                  </View>
                </View>
              </View>
            </Surface>
          ))}
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  itemsList: {
    gap: 12,
  },
  itemCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    backgroundColor: '#e1e1e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  itemFields: {
    flex: 1,
    gap: 6,
  },
  fieldInput: {
    backgroundColor: 'transparent',
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
  },
});
