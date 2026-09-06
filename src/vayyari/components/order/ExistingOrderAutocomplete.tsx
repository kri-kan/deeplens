import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { Surface, Text, TextInput, IconButton, useTheme, SegmentedButtons, ActivityIndicator, Chip } from 'react-native-paper';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry } from '@/types/orders';
import { formatDisplayHandle } from '@/utils/platformLink';

interface ExistingOrderAutocompleteProps {
  mode: 'create_new' | 'attach_existing';
  onModeChange: (mode: 'create_new' | 'attach_existing') => void;
  selectedOrderId?: string;
  onSelectOrder: (order: OrderIdEntry | null) => void;
}

export const ExistingOrderAutocomplete: React.FC<ExistingOrderAutocompleteProps> = ({
  mode,
  onModeChange,
  selectedOrderId,
  onSelectOrder,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderIdEntry[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderIdEntry[]>([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderIdEntry | null>(null);

  useEffect(() => {
    if (mode === 'attach_existing') {
      fetchOrderHistory();
    }
  }, [mode]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      const orders = await searchApiClient.get<OrderIdEntry[]>(API_ROUTES.ORDERS.HISTORY, {
        params: { limit: 50 },
      });
      if (orders && Array.isArray(orders)) {
        setRecentOrders(orders);
        setFilteredOrders(orders);
      }
    } catch (e) {
      console.warn('[ExistingOrderAutocomplete] Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrders(recentOrders);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = recentOrders.filter(o => 
      o.id.toLowerCase().includes(lower) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(lower)) ||
      (o.instagramHandle && o.instagramHandle.toLowerCase().includes(lower)) ||
      (o.customerName && o.customerName.toLowerCase().includes(lower)) ||
      (o.sourceHandle && o.sourceHandle.toLowerCase().includes(lower))
    );
    setFilteredOrders(filtered);
  };

  const handleSelect = (order: OrderIdEntry) => {
    setSelectedOrderDetails(order);
    onSelectOrder(order);
  };

  const handleClearSelection = () => {
    setSelectedOrderDetails(null);
    onSelectOrder(null);
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
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        Order Mode & Reference
      </Text>

      <SegmentedButtons
        value={mode}
        onValueChange={val => {
          const newMode = val as 'create_new' | 'attach_existing';
          onModeChange(newMode);
          if (newMode === 'create_new') {
            handleClearSelection();
          }
        }}
        buttons={[
          {
            value: 'create_new',
            label: '➕ Create New Order',
          },
          {
            value: 'attach_existing',
            label: '🔗 Attach to Order ID',
          },
        ]}
        style={styles.segmented}
      />

      {mode === 'attach_existing' && (
        <View style={styles.attachSection}>
          {selectedOrderDetails ? (
            <Surface style={[styles.selectedCard, { borderColor: theme.colors.secondary, backgroundColor: theme.colors.surface }]}>
              <View style={styles.selectedRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Chip compact icon="check-circle" textStyle={{ fontSize: 11 }}>
                      Selected: {selectedOrderDetails.id}
                    </Chip>
                    <Chip compact mode="outlined" textStyle={{ fontSize: 11 }}>
                      {selectedOrderDetails.source || 'WhatsApp'}
                    </Chip>
                  </View>
                  {selectedOrderDetails.customerPhone && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                      📞 {selectedOrderDetails.customerPhone}
                    </Text>
                  )}
                  {selectedOrderDetails.instagramHandle && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                      📸 {formatDisplayHandle('instagram', selectedOrderDetails.instagramHandle)}
                    </Text>
                  )}
                </View>
                <IconButton icon="close" size={18} onPress={handleClearSelection} />
              </View>
            </Surface>
          ) : (
            <>
              <TextInput
                label="Search Order ID, Phone, or Instagram..."
                value={searchQuery}
                onChangeText={handleSearchChange}
                mode="outlined"
                left={<TextInput.Icon icon="magnify" />}
                right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : undefined}
                style={styles.searchInput}
                outlineColor={theme.colors.outlineVariant}
                activeOutlineColor={theme.colors.secondary}
              />

              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, marginBottom: 2 }}>
                Recent Drafts & Unfulfilled IDs ({filteredOrders.length})
              </Text>

              <View style={styles.dropdownContainer}>
                {filteredOrders.slice(0, 5).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.dropdownItem, { borderBottomColor: theme.colors.outlineVariant }]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={styles.itemHeader}>
                      <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                        {item.id}
                      </Text>
                      <Chip compact textStyle={{ fontSize: 10 }}>
                        {item.paymentMode || 'COD'}
                      </Chip>
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {item.customerPhone ? `📞 ${item.customerPhone}` : ''}{' '}
                      {item.instagramHandle ? `📸 ${formatDisplayHandle('instagram', item.instagramHandle)}` : ''}{' '}
                      {item.customerAddress ? `🏠 ${item.customerAddress}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
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
  title: {
    fontWeight: 'bold',
  },
  segmented: {
    marginTop: 4,
  },
  attachSection: {
    marginTop: 6,
    gap: 8,
  },
  searchInput: {
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  selectedCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
});
