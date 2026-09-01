import React, { useState } from 'react';
import { StyleSheet, View, Modal, ScrollView, Image } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, RadioButton, Divider, TextInput } from 'react-native-paper';
import { FulfillmentItem, FulfillmentPackage, LogisticsOrder } from '@/types/logistics';

interface ItemReassignModalProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder;
  item: FulfillmentItem | null;
  onReassign: (itemId: string, targetPackageId: string) => Promise<void>;
  onCreateNewPackageAndReassign: (itemId: string, vendorName: string) => Promise<void>;
}

export const ItemReassignModal: React.FC<ItemReassignModalProps> = ({
  visible,
  onDismiss,
  order,
  item,
  onReassign,
  onCreateNewPackageAndReassign,
}) => {
  const theme = useTheme();
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (item && order.packages.length > 0) {
      // Default to first other package or current
      const other = order.packages.find(p => p.id !== item.packageId);
      setSelectedPackageId(other ? other.id : order.packages[0].id);
      setIsCreatingNew(false);
      setNewVendorName(item.vendorName || '');
    }
  }, [item, order]);

  if (!visible || !item) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      if (isCreatingNew) {
        await onCreateNewPackageAndReassign(item.id, newVendorName.trim() || item.vendorName);
      } else {
        await onReassign(item.id, selectedPackageId);
      }
      onDismiss();
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const isCod = order.paymentMode === 'COD';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
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
              <IconButton icon="package-variant-closed" size={24} iconColor={theme.colors.primary} style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  Reassign Item to Package
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Item: {item.productName}
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          {/* Item details card */}
          <Surface style={[styles.itemSummaryCard, { backgroundColor: (theme.colors as any).surfaceContainerLowest || '#fff' }]} elevation={1}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.itemImg} />
            ) : (
              <View style={styles.itemImgPlaceholder}>
                <IconButton icon="tshirt-crew" size={24} />
              </View>
            )}
            <View style={styles.itemMeta}>
              <Text variant="titleSmall" numberOfLines={1} style={{ fontWeight: 'bold' }}>
                {item.productName}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                SKU: {item.sku || 'N/A'} • Qty: {item.quantity} • Value: ₹{item.totalPrice}
              </Text>
              {isCod && (
                <Text variant="labelSmall" style={{ color: '#b71c1c', fontWeight: 'bold', marginTop: 2 }}>
                  COD Impact: ₹{item.totalPrice}
                </Text>
              )}
            </View>
          </Surface>

          <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Select Destination Package:
          </Text>

          <ScrollView style={styles.packagesList}>
            {order.packages.map((pkg) => {
              const isCurrent = pkg.id === item.packageId;
              const isSelected = !isCreatingNew && selectedPackageId === pkg.id;

              return (
                <Surface
                  key={pkg.id}
                  style={[
                    styles.pkgOption,
                    {
                      backgroundColor: isSelected
                        ? (theme.colors as any).secondaryContainer || '#e8f5e9'
                        : (theme.colors as any).surfaceContainerLowest || '#fff',
                      borderColor: isSelected ? theme.colors.secondary : theme.colors.outlineVariant,
                    },
                  ]}
                  elevation={isSelected ? 2 : 0}
                >
                  <RadioButton
                    value={pkg.id}
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setIsCreatingNew(false);
                      setSelectedPackageId(pkg.id);
                    }}
                  />
                  <View style={styles.pkgOptionContent}>
                    <View style={styles.pkgTitleRow}>
                      <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                        Package #{pkg.packageNumber} ({pkg.vendorName})
                      </Text>
                      {isCurrent && (
                        <Text style={styles.currentBadge}>(Current)</Text>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {pkg.items.length} item(s) • Total: ₹{pkg.packageValue} • {pkg.fulfillmentPath}
                    </Text>
                  </View>
                </Surface>
              );
            })}

            {/* Option to create a brand new package */}
            <Surface
              style={[
                styles.pkgOption,
                {
                  backgroundColor: isCreatingNew
                    ? (theme.colors as any).primaryContainer || '#e5e2e1'
                    : (theme.colors as any).surfaceContainerLowest || '#fff',
                  borderColor: isCreatingNew ? theme.colors.primary : theme.colors.outlineVariant,
                },
              ]}
              elevation={isCreatingNew ? 2 : 0}
            >
              <RadioButton
                value="new_package"
                status={isCreatingNew ? 'checked' : 'unchecked'}
                onPress={() => setIsCreatingNew(true)}
              />
              <View style={styles.pkgOptionContent}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  + Create New Package #{order.packages.length + 1}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Split into a dedicated new shipping consignment
                </Text>
              </View>
            </Surface>

            {isCreatingNew && (
              <View style={styles.newVendorInputWrapper}>
                <TextInput
                  mode="outlined"
                  label="Vendor Name / Supplier"
                  value={newVendorName}
                  onChangeText={setNewVendorName}
                  style={styles.vendorInput}
                />
              </View>
            )}
          </ScrollView>

          {/* Action Bar */}
          <View style={styles.footerRow}>
            <Button mode="outlined" onPress={onDismiss} style={styles.footerBtn}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={loading}
              disabled={loading || (!isCreatingNew && !selectedPackageId)}
              onPress={handleConfirm}
              style={styles.footerBtn}
            >
              Reassign Item
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
    maxHeight: '90%',
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  itemSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 14,
  },
  itemImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
  },
  itemImgPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemMeta: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  packagesList: {
    maxHeight: 260,
  },
  pkgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pkgOptionContent: {
    flex: 1,
    marginLeft: 6,
  },
  pkgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentBadge: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  newVendorInputWrapper: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  vendorInput: {
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
  },
});
