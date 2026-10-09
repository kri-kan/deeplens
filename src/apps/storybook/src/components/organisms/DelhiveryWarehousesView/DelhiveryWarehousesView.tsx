import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuX,
  LuBuilding2,
  LuPencil,
  LuTrash2,
  LuStar,
  LuMapPin,
  LuPhone,
  LuUser,
  LuTruck,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface DelhiveryWarehouseItem {
  id: string;
  name: string;
  code: string;
  addressLine1?: string;
  address_line1?: string;
  addressLine2?: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  contactPerson?: string;
  contact_person?: string;
  isCentral?: boolean;
  is_central?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  registeredWithDelhivery?: boolean;
  isRegistered?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface DelhiveryWarehousesViewProps {
  warehouses: DelhiveryWarehouseItem[];
  loading?: boolean;
  syncing?: boolean;
  lastSyncedAt?: string | null;
  onSync?: () => void;
  onAddFacility?: () => void;
  onEditFacility?: (warehouse: DelhiveryWarehouseItem) => void;
  onDeleteFacility?: (warehouse: DelhiveryWarehouseItem) => void;
  onRefresh?: () => void;
  showHeaderTitle?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function DelhiveryWarehousesView({
  warehouses,
  loading = false,
  syncing = false,
  lastSyncedAt = null,
  onSync,
  onAddFacility,
  onEditFacility,
  onDeleteFacility,
  showHeaderTitle = true,
  searchQuery,
  onSearchChange,
}: DelhiveryWarehousesViewProps) {
  const { tokens } = useTheme();

  const [internalSearch, setInternalSearch] = useState('');

  const activeQuery = searchQuery !== undefined ? searchQuery : internalSearch;

  const handleSearchChange = (text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    }
    setInternalSearch(text);
  };

  const handleClearSearch = () => {
    handleSearchChange('');
  };

  const filteredWarehouses = useMemo(() => {
    if (!activeQuery.trim()) {
      return warehouses;
    }
    const q = activeQuery.toLowerCase().trim();
    return warehouses.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const city = item.city?.toLowerCase() || '';
      const state = item.state?.toLowerCase() || '';
      const pincode = item.pincode?.toLowerCase() || '';
      const contact = (item.contactPerson || item.contact_person || '').toLowerCase();
      const phone = item.phone?.toLowerCase() || '';
      const address1 = (item.addressLine1 || item.address_line1 || '').toLowerCase();

      return (
        name.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        pincode.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        address1.includes(q)
      );
    });
  }, [warehouses, activeQuery]);

  const formatLastSynced = (timestamp?: string | null) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  const surfaceColor = tokens?.surface ?? '#FFFFFF';
  const surfaceRaised = tokens?.surfaceRaised ?? '#F8FAFC';
  const borderColor = tokens?.border ?? '#E2E8F0';
  const textColor = tokens?.text ?? '#0F172A';
  const textSecondary = tokens?.textSecondary ?? '#475569';
  const textMuted = tokens?.textMuted ?? '#94A3B8';
  const accentColor = tokens?.accent ?? '#0F766E';
  const radiusMd = tokens?.radius?.md ?? 8;
  const radiusFull = tokens?.radius?.full ?? 9999;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <YStack gap={8} width="100%" maxWidth={960} alignSelf="center">
        {/* Optional Screen Title Header */}
        {showHeaderTitle && (
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={6}>
              <LuBuilding2 size={18} color={accentColor} />
              <Text fontSize={17} fontWeight="800" color={textColor} letterSpacing={-0.3}>
                Delhivery Warehouses
              </Text>
            </XStack>
          </XStack>
        )}

        {/* Top Control Bar: Compact Counter & Actions */}
        <XStack justifyContent="space-between" alignItems="center" gap={8}>
          <XStack alignItems="center" gap={6}>
            <XStack
              backgroundColor={surfaceRaised}
              borderWidth={1}
              borderColor={borderColor}
              paddingHorizontal={8}
              paddingVertical={3}
              borderRadius={radiusFull}
              alignItems="center"
              gap={4}
            >
              <LuBuilding2 size={12} color={accentColor} />
              <Text fontSize={12} fontWeight="700" color={textColor}>
                {warehouses.length} {warehouses.length === 1 ? 'Facility' : 'Facilities'}
              </Text>
            </XStack>

            {lastSyncedAt && (
              <Text fontSize={11} color={textMuted} fontWeight="500">
                Synced {formatLastSynced(lastSyncedAt)}
              </Text>
            )}
          </XStack>

          {/* Action Buttons */}
          <XStack alignItems="center" gap={6}>
            {onSync && (
              <Pressable
                onPress={onSync}
                disabled={syncing}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: radiusMd,
                    backgroundColor: surfaceRaised,
                    borderWidth: 1,
                    borderColor: borderColor,
                    opacity: syncing ? 0.6 : pressed ? 0.75 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sync warehouses from Delhivery"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <LuRefreshCw size={12} color={textSecondary} />
                )}
                <Text fontSize={12} fontWeight="600" color={textColor}>
                  {syncing ? 'Syncing...' : 'Sync'}
                </Text>
              </Pressable>
            )}

            {onAddFacility && (
              <Pressable
                onPress={onAddFacility}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: accentColor,
                    borderRadius: radiusMd,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add New Facility"
              >
                <LuPlus size={13} color="#FFFFFF" />
                <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                  Add Facility
                </Text>
              </Pressable>
            )}
          </XStack>
        </XStack>

        {/* Compact Search & Filter Bar */}
        <XStack
          backgroundColor={surfaceColor}
          borderWidth={1}
          borderColor={borderColor}
          borderRadius={radiusMd}
          paddingHorizontal={9}
          paddingVertical={5}
          alignItems="center"
          gap={8}
        >
          <LuSearch size={14} color={textMuted} />
          <TextInput
            value={activeQuery}
            onChangeText={handleSearchChange}
            placeholder="Search facilities, city, pincode, or contact..."
            placeholderTextColor={textMuted}
            style={{
              flex: 1,
              fontSize: 12,
              color: textColor,
              paddingVertical: Platform.OS === 'web' ? 2 : 0,
              outlineStyle: 'none',
            } as any}
          />
          {activeQuery.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 2 }]}
              accessibilityLabel="Clear search"
            >
              <LuX size={13} color={textSecondary} />
            </Pressable>
          )}
          {activeQuery.trim().length > 0 && (
            <XStack
              backgroundColor={surfaceRaised}
              paddingHorizontal={6}
              paddingVertical={1}
              borderRadius={radiusFull}
            >
              <Text fontSize={10} fontWeight="600" color={textSecondary}>
                {filteredWarehouses.length}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Loading State */}
        {loading && (
          <YStack
            backgroundColor={surfaceColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius={radiusMd}
            paddingVertical={32}
            alignItems="center"
            justifyContent="center"
            gap={10}
          >
            <ActivityIndicator size="small" color={accentColor} />
            <Text fontSize={12} fontWeight="600" color={textSecondary}>
              Loading pickup facilities...
            </Text>
          </YStack>
        )}

        {/* Empty State */}
        {!loading && filteredWarehouses.length === 0 && (
          <YStack
            backgroundColor={surfaceColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius={radiusMd}
            paddingVertical={32}
            paddingHorizontal={16}
            alignItems="center"
            justifyContent="center"
            gap={8}
          >
            <LuBuilding2 size={24} color={textMuted} />
            <Text fontSize={14} fontWeight="700" color={textColor} textAlign="center">
              No pickup facilities found
            </Text>
            <Text fontSize={12} color={textSecondary} textAlign="center">
              {activeQuery.trim()
                ? `No facilities matched "${activeQuery}".`
                : 'No Delhivery pickup facilities configured.'}
            </Text>
            {activeQuery.trim() ? (
              <Pressable
                onPress={handleClearSearch}
                style={({ pressed }) => [
                  {
                    marginTop: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radiusMd,
                    backgroundColor: surfaceRaised,
                    borderWidth: 1,
                    borderColor: borderColor,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text fontSize={11} fontWeight="600" color={textColor}>
                  Clear Search
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onAddFacility}
                style={({ pressed }) => [
                  {
                    marginTop: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radiusMd,
                    backgroundColor: accentColor,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <LuPlus size={12} color="#FFFFFF" />
                <Text fontSize={11} fontWeight="700" color="#FFFFFF">
                  Add First Facility
                </Text>
              </Pressable>
            )}
          </YStack>
        )}

        {/* Ultra-Compact Facility Cards List */}
        {!loading && filteredWarehouses.length > 0 && (
          <YStack gap={6}>
            {filteredWarehouses.map((warehouse) => {
              const addressLine1 = warehouse.addressLine1 || warehouse.address_line1 || '';
              const addressLine2 = warehouse.addressLine2 || warehouse.address_line2 || '';
              const contactPerson = warehouse.contactPerson || warehouse.contact_person || '';
              const isCentral = !!(warehouse.isCentral ?? warehouse.is_central);
              const isRegistered = warehouse.registeredWithDelhivery ?? warehouse.isRegistered ?? true;

              return (
                <YStack
                  key={warehouse.id}
                  backgroundColor={surfaceColor}
                  borderRadius={radiusMd}
                  borderWidth={isCentral ? 1.5 : 1}
                  borderColor={isCentral ? '#F59E0B' : borderColor}
                  paddingVertical={8}
                  paddingHorizontal={10}
                  gap={4}
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.03}
                  shadowRadius={2}
                  elevation={1}
                >
                  {/* Card Header Row: Facility Name + Star + Delhivery Logo Badge + Actions */}
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack alignItems="center" gap={6} flex={1} marginRight={6}>
                      <Text fontSize={14} fontWeight="700" color={textColor} numberOfLines={1}>
                        {warehouse.name}
                      </Text>

                      {/* Central Hub Star Indicator Only */}
                      {isCentral && (
                        <YStack>
                          <LuStar size={13} color="#F59E0B" fill="#F59E0B" />
                        </YStack>
                      )}

                      {/* Delhivery Logo Micro-Badge */}
                      {isRegistered && (
                        <XStack
                          alignItems="center"
                          gap={3}
                          paddingHorizontal={5}
                          paddingVertical={1.5}
                          borderRadius={3}
                          backgroundColor="#FEF2F2"
                          borderWidth={1}
                          borderColor="#FECACA"
                        >
                          <LuTruck size={10} color="#DC2626" />
                          <Text
                            fontSize={9}
                            fontWeight="900"
                            color="#DC2626"
                            letterSpacing={0.4}
                            style={{ includeFontPadding: false } as any}
                          >
                            DELHIVERY
                          </Text>
                        </XStack>
                      )}
                    </XStack>

                    {/* Compact Actions */}
                    <XStack alignItems="center" gap={4}>
                      {onEditFacility && (
                        <Pressable
                          onPress={() => onEditFacility(warehouse)}
                          style={({ pressed }) => [
                            {
                              padding: 4,
                              borderRadius: 4,
                              backgroundColor: surfaceRaised,
                              borderWidth: 1,
                              borderColor: borderColor,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${warehouse.name}`}
                        >
                          <LuPencil size={12} color={textSecondary} />
                        </Pressable>
                      )}

                      {onDeleteFacility && (
                        <Pressable
                          onPress={() => onDeleteFacility(warehouse)}
                          style={({ pressed }) => [
                            {
                              padding: 4,
                              borderRadius: 4,
                              backgroundColor: '#FEF2F2',
                              borderWidth: 1,
                              borderColor: '#FEE2E2',
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${warehouse.name}`}
                        >
                          <LuTrash2 size={12} color="#EF4444" />
                        </Pressable>
                      )}
                    </XStack>
                  </XStack>

                  {/* Ultra-Compact Address Line */}
                  <XStack alignItems="flex-start" gap={5}>
                    <YStack marginTop={1}>
                      <LuMapPin size={12} color={textMuted} />
                    </YStack>
                    <Text fontSize={11.5} lineHeight={16} color={textSecondary} flex={1} numberOfLines={2}>
                      {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}, {warehouse.city}, {warehouse.state} -{' '}
                      <Text fontWeight="700" color={textColor}>
                        {warehouse.pincode}
                      </Text>
                    </Text>
                  </XStack>

                  {/* Compact Contact & Phone Row */}
                  <XStack justifyContent="space-between" alignItems="center" paddingTop={1}>
                    <XStack alignItems="center" gap={12} flex={1}>
                      {/* Contact Person */}
                      <XStack alignItems="center" gap={3}>
                        <LuUser size={11} color={textMuted} />
                        <Text fontSize={11} color={textSecondary} numberOfLines={1}>
                          {contactPerson || 'Ops Incharge'}
                        </Text>
                      </XStack>

                      {/* Phone with Tap-to-Dial */}
                      {warehouse.phone && (
                        <Pressable
                          onPress={() => {
                            const telUri = `tel:${warehouse.phone?.replace(/[^0-9+]/g, '')}`;
                            Linking.canOpenURL(telUri).then((supported) => {
                              if (supported) Linking.openURL(telUri);
                            }).catch(() => {});
                          }}
                          style={({ pressed }) => [
                            {
                              opacity: pressed ? 0.7 : 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                            },
                          ]}
                        >
                          <LuPhone size={11} color={textMuted} />
                          <Text fontSize={11} fontWeight="600" color={textColor}>
                            {warehouse.phone}
                          </Text>
                        </Pressable>
                      )}
                    </XStack>
                  </XStack>
                </YStack>
              );
            })}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
