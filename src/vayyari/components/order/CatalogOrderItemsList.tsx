import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Surface, Text, IconButton, useTheme, Button, Chip } from 'react-native-paper';
import { OrderItemDraft } from '@/types/orders';
import { CatalogItemPickerModal } from './CatalogItemPickerModal';

interface CatalogOrderItemsListProps {
  items: OrderItemDraft[];
  onAddItem: (item: OrderItemDraft) => void;
  onRemoveItem: (id: string) => void;
  mappedVendorId?: string;
}

export const CatalogOrderItemsList: React.FC<CatalogOrderItemsListProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  mappedVendorId,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

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
          <IconButton icon="book-search" size={20} iconColor={theme.colors.secondary} style={styles.icon} />
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Catalog Products ({items.length})
          </Text>
        </View>
        <Button
          mode="contained-tonal"
          compact
          icon="plus"
          onPress={() => setModalVisible(true)}
          labelStyle={{ fontWeight: 'bold' }}
        >
          Add from Catalog
        </Button>
      </View>

      {items.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyState, { borderColor: theme.colors.outlineVariant }]}
          onPress={() => setModalVisible(true)}
        >
          <IconButton icon="magnify-plus-outline" size={32} iconColor={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No catalog products added. Tap to search & prioritize vendors.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.itemsList}>
          {items.map(item => (
            <Surface
              key={item.id}
              style={[styles.itemCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
              elevation={0}
            >
              <View style={styles.itemRow}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.placeholderThumb]}>
                    <IconButton icon="image-outline" size={20} />
                  </View>
                )}

                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }} numberOfLines={1}>
                    {item.productTitle || item.productCode}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                    {item.vendorName ? `Vendor: ${item.vendorName}` : `SKU: ${item.productCode}`}
                  </Text>
                  <View style={styles.priceMeta}>
                    <Chip compact textStyle={{ fontSize: 10 }}>
                      Qty: {item.quantity}
                    </Chip>
                    <Text variant="bodySmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                      ₹{item.unitPrice} × {item.quantity} = ₹{item.subtotal}
                    </Text>
                  </View>
                </View>

                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => onRemoveItem(item.id)}
                />
              </View>
            </Surface>
          ))}
        </View>
      )}

      <CatalogItemPickerModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        mappedVendorId={mappedVendorId}
        onSelectItem={onAddItem}
      />
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
    gap: 8,
  },
  itemCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderThumb: {
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
});
