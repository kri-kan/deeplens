import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuBuilding2,
  LuMapPin,
  LuPhone,
  LuUser,
  LuPlus,
  LuRefreshCw,
  LuPencil,
  LuTrash2,
  LuStar,
  LuX,
  LuSearch,
  LuTruck,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export interface DelhiveryWarehouseItem {
  id: string;
  name: string;
  code: string;
  addressLine1?: string;
  address_line1?: string;
  addressLine2?: string | null;
  address_line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactPerson?: string;
  contact_person?: string;
  isCentral?: boolean;
  is_central?: boolean;
  isStarred?: boolean;
  is_starred?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  registeredWithDelhivery?: boolean;
  isRegistered?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
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
  onToggleStar?: (warehouse: DelhiveryWarehouseItem) => void;
  onRefresh?: () => void;
  showHeaderTitle?: boolean;
  onBack?: () => void;
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
  onToggleStar,
  onRefresh,
  showHeaderTitle = false,
  onBack,
  searchQuery,
  onSearchChange,
}: DelhiveryWarehousesViewProps) {
  const { tokens } = useTheme();

  const [internalSearch, setInternalSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const filteredWarehouses = useMemo(() => {
    let list = warehouses;
    if (activeQuery.trim()) {
      const q = activeQuery.toLowerCase().trim();
      list = warehouses.filter((item) => {
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
    }

    return [...list].sort((a, b) => {
      const aStarred = Boolean(a.isStarred ?? a.is_starred);
      const bStarred = Boolean(b.isStarred ?? b.is_starred);
      if (aStarred !== bStarred) return bStarred ? 1 : -1;

      const aCentral = Boolean(a.isCentral ?? a.is_central);
      const bCentral = Boolean(b.isCentral ?? b.is_central);
      if (aCentral !== bCentral) return bCentral ? 1 : -1;

      return (a.name || '').localeCompare(b.name || '');
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
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[accentColor]}
            tintColor={accentColor}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      <YStack gap={8} width="100%" maxWidth={960} alignSelf="center">
        {/* Optional Header when rendered standalone */}
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
              const isStarred = Boolean(warehouse.isStarred ?? warehouse.is_starred);
              const isRegistered = warehouse.registeredWithDelhivery ?? warehouse.isRegistered ?? true;

              return (
                <YStack
                  key={warehouse.id}
                  backgroundColor={surfaceColor}
                  borderRadius={radiusMd}
                  borderWidth={isStarred ? 1.5 : isCentral ? 1.5 : 1}
                  borderColor={isStarred ? '#F59E0B' : isCentral ? '#0284C7' : borderColor}
                  paddingVertical={9}
                  paddingHorizontal={12}
                  gap={6}
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.03}
                  shadowRadius={2}
                  elevation={1}
                >
                  {/* Card Header Row: Facility Name + Star + Delhivery Logo Badge + Actions */}
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack alignItems="center" gap={6} flex={1} marginRight={8}>
                      {/* Star Favorite Toggle Button */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isStarred ? `Unstar ${warehouse.name}` : `Star ${warehouse.name}`}
                        onPress={() => onToggleStar?.(warehouse)}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                          padding: 2,
                        })}
                      >
                        <LuStar
                          size={15}
                          color={isStarred ? '#F59E0B' : '#94A3B8'}
                          fill={isStarred ? '#F59E0B' : 'transparent'}
                        />
                      </Pressable>

                      <Text fontSize={14.5} fontWeight="700" color={textColor} numberOfLines={1}>
                        {warehouse.name}
                      </Text>

                      {/* Central Hub Pill */}
                      {isCentral && (
                        <XStack
                          backgroundColor="#E0F2FE"
                          paddingHorizontal={5}
                          paddingVertical={1.5}
                          borderRadius={3}
                          borderWidth={1}
                          borderColor="#BAE6FD"
                        >
                          <Text fontSize={8.5} fontWeight="900" color="#0284C7" letterSpacing={0.5}>
                            CENTRAL HUB
                          </Text>
                        </XStack>
                      )}

                      {/* Delhivery Logo Micro-Badge */}
                      {isRegistered && (
                        <XStack
                          alignItems="center"
                          gap={3.5}
                          paddingHorizontal={5.5}
                          paddingVertical={2}
                          borderRadius={3.5}
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
                              padding: 5,
                              borderRadius: 5,
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
                              padding: 5,
                              borderRadius: 5,
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

                  {/* Second Row: Contact Person & Tap-to-Dial Phone (Well-spaced, clean) */}
                  <XStack justifyContent="space-between" alignItems="center">
                    {/* Contact Person */}
                    <XStack alignItems="center" gap={5} flex={1} marginRight={8}>
                      <LuUser size={12} color={textMuted} />
                      <Text fontSize={12} color={textSecondary} numberOfLines={1} fontWeight="500">
                        {contactPerson || 'Ops Incharge'}
                      </Text>
                    </XStack>

                    {/* Phone with Tap-to-Dial Pill */}
                    {warehouse.phone ? (
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
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2.5,
                            borderRadius: radiusFull,
                            backgroundColor: surfaceRaised,
                            borderWidth: 1,
                            borderColor: borderColor,
                          },
                        ]}
                      >
                        <LuPhone size={10.5} color={accentColor} />
                        <Text fontSize={11.5} fontWeight="600" color={textColor}>
                          {warehouse.phone}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text fontSize={11} color={textMuted} fontStyle="italic">
                        No phone
                      </Text>
                    )}
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
