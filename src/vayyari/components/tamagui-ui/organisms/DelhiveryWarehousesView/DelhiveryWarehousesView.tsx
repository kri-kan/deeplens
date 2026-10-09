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
  LuCheck,
  LuInfo,
  LuX,
  LuSearch,
  LuChevronDown,
  LuChevronUp,
  LuArrowLeft,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { StatusBadge } from '@/components/tamagui-ui/atoms/StatusBadge';

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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBack?: () => void;
  onRefresh?: () => void;
  showHeaderTitle?: boolean;
}

export function DelhiveryWarehousesView({
  warehouses = [],
  loading = false,
  syncing = false,
  lastSyncedAt,
  onSync,
  onAddFacility,
  onEditFacility,
  onDeleteFacility,
  searchQuery,
  onSearchChange,
  onBack,
  onRefresh,
  showHeaderTitle = true,
}: DelhiveryWarehousesViewProps) {
  const { tokens } = useTheme();

  const [internalSearch, setInternalSearch] = useState('');
  const [isTipDismissed, setIsTipDismissed] = useState(false);
  const [isTipCollapsed, setIsTipCollapsed] = useState(false);

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
      const code = item.code?.toLowerCase() || '';
      const city = item.city?.toLowerCase() || '';
      const state = item.state?.toLowerCase() || '';
      const pincode = item.pincode?.toLowerCase() || '';
      const contact = (item.contactPerson || item.contact_person || '').toLowerCase();
      const phone = item.phone?.toLowerCase() || '';
      const address1 = (item.addressLine1 || item.address_line1 || '').toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
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
      if (isNaN(date.getTime())) return timestamp;
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return timestamp;
    }
  };

  // Safe color fallbacks from tokens
  const surfaceColor = tokens?.surface ?? '#FFFFFF';
  const surfaceRaised = tokens?.surfaceRaised ?? '#F8FAFC';
  const backgroundColor = tokens?.background ?? '#F1F5F9';
  const borderColor = tokens?.border ?? '#E2E8F0';
  const borderStrong = tokens?.borderStrong ?? '#CBD5E1';
  const textColor = tokens?.text ?? '#0F172A';
  const textSecondary = tokens?.textSecondary ?? '#64748B';
  const textMuted = tokens?.textMuted ?? '#94A3B8';
  const accentColor = tokens?.accent ?? '#0F172A';
  const radiusMd = tokens?.radius?.md ?? 8;
  const radiusLg = tokens?.radius?.lg ?? 12;
  const radiusFull = tokens?.radius?.full ?? 9999;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <YStack gap={14} width="100%" maxWidth={1120} alignSelf="center">
        {/* Header Title Section (if enabled) */}
        {showHeaderTitle ? (
          <XStack
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={12}
          >
            <XStack alignItems="center" gap={8} flex={1}>
              {onBack && (
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [
                    {
                      padding: 8,
                      borderRadius: radiusMd,
                      backgroundColor: surfaceColor,
                      borderWidth: 1,
                      borderColor: borderColor,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <LuArrowLeft size={16} color={textColor} />
                </Pressable>
              )}
              <YStack gap={4} flex={1}>
                <XStack alignItems="center" gap={10} flexWrap="wrap">
                  <Text
                    fontSize={20}
                    lineHeight={26}
                    fontWeight="800"
                    color={textColor}
                    letterSpacing={-0.5}
                  >
                    Delhivery Pickup Warehouses
                  </Text>
                  <XStack
                    backgroundColor={surfaceRaised}
                    borderWidth={1}
                    borderColor={borderColor}
                    paddingHorizontal={10}
                    paddingVertical={3}
                    borderRadius={radiusFull}
                    alignItems="center"
                    gap={5}
                  >
                    <LuBuilding2 size={13} color={textSecondary} />
                    <Text fontSize={12} fontWeight="700" color={textSecondary}>
                      {warehouses.length} {warehouses.length === 1 ? 'Hub' : 'Hubs'}
                    </Text>
                  </XStack>
                </XStack>
                <Text fontSize={13} lineHeight={18} color={textSecondary}>
                  Manage synchronized dispatch origin facilities, pickup hubs, and return locations.
                </Text>
              </YStack>
            </XStack>

            {/* Header Action Buttons */}
            <XStack alignItems="center" gap={10}>
              {/* Sync Button */}
              <Pressable
                onPress={onSync}
                disabled={syncing || loading}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    backgroundColor: surfaceColor,
                    borderRadius: radiusMd,
                    borderWidth: 1,
                    borderColor: borderColor,
                    opacity: syncing || loading ? 0.7 : pressed ? 0.85 : 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sync with Delhivery"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={textColor} />
                ) : (
                  <LuRefreshCw size={14} color={textColor} />
                )}
                <Text fontSize={13} fontWeight="600" color={textColor}>
                  {syncing ? 'Syncing...' : 'Sync Hubs'}
                </Text>
              </Pressable>

              {/* Add Facility Button */}
              <Pressable
                onPress={onAddFacility}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    backgroundColor: accentColor,
                    borderRadius: radiusMd,
                    opacity: pressed ? 0.9 : 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add New Facility"
              >
                <LuPlus size={16} color="#FFFFFF" />
                <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                  Add Facility
                </Text>
              </Pressable>
            </XStack>
          </XStack>
        ) : (
          /* Compact Control Bar when header title is provided by parent screen */
          <XStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={10}
            backgroundColor={surfaceColor}
            paddingHorizontal={14}
            paddingVertical={10}
            borderRadius={radiusLg}
            borderWidth={1}
            borderColor={borderColor}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 1 }}
            shadowOpacity={0.03}
            shadowRadius={2}
            elevation={1}
          >
            <YStack gap={2}>
              <XStack alignItems="center" gap={6}>
                <LuBuilding2 size={15} color={textSecondary} />
                <Text fontSize={14} fontWeight="700" color={textColor}>
                  {warehouses.length} {warehouses.length === 1 ? 'Pickup Facility' : 'Pickup Facilities'}
                </Text>
              </XStack>
              {lastSyncedAt && (
                <Text fontSize={11} color={textMuted} fontWeight="500">
                  Last synced: {formatLastSynced(lastSyncedAt)}
                </Text>
              )}
            </YStack>

            <XStack alignItems="center" gap={8}>
              <Pressable
                onPress={onSync}
                disabled={syncing || loading}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: surfaceRaised,
                    borderRadius: radiusMd,
                    borderWidth: 1,
                    borderColor: borderColor,
                    opacity: syncing || loading ? 0.7 : pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sync with Delhivery"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={textColor} />
                ) : (
                  <LuRefreshCw size={13} color={textColor} />
                )}
                <Text fontSize={12} fontWeight="600" color={textColor}>
                  {syncing ? 'Syncing...' : 'Sync'}
                </Text>
              </Pressable>

              <Pressable
                onPress={onAddFacility}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: accentColor,
                    borderRadius: radiusMd,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add New Facility"
              >
                <LuPlus size={14} color="#FFFFFF" />
                <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                  Add Facility
                </Text>
              </Pressable>
            </XStack>
          </XStack>
        )}

        {/* Sync Status Banner (Only for Standalone / Storybook mode) */}
        {showHeaderTitle && lastSyncedAt && (
          <XStack alignItems="center" gap={6} marginTop={-6}>
            <Text fontSize={11} color={textMuted} fontWeight="500">
              Last synced with Delhivery Express API:
            </Text>
            <Text fontSize={11} color={textSecondary} fontWeight="600">
              {formatLastSynced(lastSyncedAt)}
            </Text>
          </XStack>
        )}

        {/* Informational Tip Card */}
        {!isTipDismissed && (
          <YStack
            backgroundColor={surfaceRaised}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius={radiusLg}
            padding={14}
            gap={8}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={8} flex={1}>
                <YStack
                  backgroundColor="#E0F2FE"
                  borderRadius={radiusFull}
                  padding={5}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuInfo size={14} color="#0369A1" />
                </YStack>
                <Text fontSize={13} fontWeight="700" color={textColor}>
                  Delhivery Pickup Registry & Reverse Logistics
                </Text>
              </XStack>

              <XStack alignItems="center" gap={6}>
                <Pressable
                  onPress={() => setIsTipCollapsed((prev) => !prev)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                  accessibilityLabel="Toggle tip banner"
                >
                  {isTipCollapsed ? (
                    <LuChevronDown size={16} color={textSecondary} />
                  ) : (
                    <LuChevronUp size={16} color={textSecondary} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setIsTipDismissed(true)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                  accessibilityLabel="Dismiss tip banner"
                >
                  <LuX size={15} color={textMuted} />
                </Pressable>
              </XStack>
            </XStack>

            {!isTipCollapsed && (
              <Text fontSize={12} lineHeight={18} color={textSecondary}>
                Facilities listed here are registered origin points for courier pickup scheduling.
                When generating shipping labels in fulfillment workflows, packages are assigned to
                these registered pickup codes. The <Text fontWeight="700" color={textColor}>Central Hub</Text> serves
                as the primary consolidation point for multi-item and returned shipments.
              </Text>
            )}
          </YStack>
        )}

        {/* Search & Filter Bar */}
        <XStack
          backgroundColor={surfaceColor}
          borderWidth={1}
          borderColor={borderColor}
          borderRadius={radiusLg}
          paddingHorizontal={12}
          paddingVertical={8}
          alignItems="center"
          gap={10}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={0.04}
          shadowRadius={2}
          elevation={1}
        >
          <LuSearch size={16} color={textMuted} />
          <TextInput
            value={activeQuery}
            onChangeText={handleSearchChange}
            placeholder="Search by facility name, code, city, pincode, or contact..."
            placeholderTextColor={textMuted}
            style={{
              flex: 1,
              fontSize: 13,
              color: textColor,
              paddingVertical: Platform.OS === 'web' ? 4 : 2,
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
            }}
          />
          {activeQuery.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
              accessibilityLabel="Clear search"
            >
              <LuX size={15} color={textSecondary} />
            </Pressable>
          )}
          {activeQuery.trim().length > 0 && (
            <XStack
              backgroundColor={surfaceRaised}
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={radiusFull}
            >
              <Text fontSize={11} fontWeight="600" color={textSecondary}>
                {filteredWarehouses.length} matching
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
            borderRadius={radiusLg}
            paddingVertical={48}
            alignItems="center"
            justifyContent="center"
            gap={14}
          >
            <ActivityIndicator size="large" color={accentColor} />
            <Text fontSize={13} fontWeight="600" color={textSecondary}>
              Loading Delhivery pickup facilities...
            </Text>
          </YStack>
        )}

        {/* Empty State */}
        {!loading && filteredWarehouses.length === 0 && (
          <YStack
            backgroundColor={surfaceColor}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius={radiusLg}
            paddingVertical={48}
            paddingHorizontal={24}
            alignItems="center"
            justifyContent="center"
            gap={12}
          >
            <YStack
              backgroundColor={surfaceRaised}
              borderRadius={radiusFull}
              padding={16}
              alignItems="center"
              justifyContent="center"
            >
              <LuBuilding2 size={32} color={textMuted} />
            </YStack>
            <Text fontSize={16} fontWeight="700" color={textColor} textAlign="center">
              No pickup facilities found
            </Text>
            <Text
              fontSize={13}
              lineHeight={18}
              color={textSecondary}
              textAlign="center"
              maxWidth={380}
            >
              {activeQuery.trim()
                ? `No facilities matched "${activeQuery}". Check the search term or clear the filter.`
                : 'No Delhivery warehouses are currently configured. Add your first facility to enable automated label generation.'}
            </Text>
            {activeQuery.trim() ? (
              <Pressable
                onPress={handleClearSearch}
                style={({ pressed }) => [
                  {
                    marginTop: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: radiusMd,
                    backgroundColor: surfaceRaised,
                    borderWidth: 1,
                    borderColor: borderColor,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text fontSize={12} fontWeight="600" color={textColor}>
                  Clear Search
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onAddFacility}
                style={({ pressed }) => [
                  {
                    marginTop: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: radiusMd,
                    backgroundColor: accentColor,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <LuPlus size={14} color="#FFFFFF" />
                <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                  Add First Facility
                </Text>
              </Pressable>
            )}
          </YStack>
        )}

        {/* Facility Cards Grid / List */}
        {!loading && filteredWarehouses.length > 0 && (
          <YStack gap={12}>
            {filteredWarehouses.map((warehouse) => {
              const addressLine1 =
                warehouse.addressLine1 || warehouse.address_line1 || '';
              const addressLine2 =
                warehouse.addressLine2 || warehouse.address_line2 || '';
              const contactPerson =
                warehouse.contactPerson || warehouse.contact_person || '';
              const isCentral = !!(warehouse.isCentral ?? warehouse.is_central);
              const isRegistered =
                warehouse.registeredWithDelhivery ??
                warehouse.isRegistered ??
                true;

              return (
                <YStack
                  key={warehouse.id}
                  backgroundColor={surfaceColor}
                  borderRadius={radiusLg}
                  borderWidth={isCentral ? 2 : 1}
                  borderColor={isCentral ? '#F59E0B' : borderColor}
                  padding={16}
                  gap={12}
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.04}
                  shadowRadius={3}
                  elevation={1}
                >
                  {/* Card Header */}
                  <XStack
                    justifyContent="space-between"
                    alignItems="flex-start"
                    flexWrap="wrap"
                    gap={8}
                  >
                    {/* Title, Code & Status Badges */}
                    <XStack alignItems="center" flexWrap="wrap" gap={8} flex={1}>
                      <Text fontSize={16} fontWeight="700" color={textColor}>
                        {warehouse.name}
                      </Text>

                      {/* Code Badge */}
                      <XStack
                        backgroundColor={surfaceRaised}
                        borderWidth={1}
                        borderColor={borderColor}
                        paddingHorizontal={8}
                        paddingVertical={2}
                        borderRadius={tokens?.radius?.xs ?? 4}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="700"
                          color={textSecondary}
                          style={{ letterSpacing: 0.5 } as any}
                        >
                          {warehouse.code}
                        </Text>
                      </XStack>

                      {/* Central Hub Badge */}
                      {isCentral && (
                        <StatusBadge
                          intent="attention"
                          label="Central Hub"
                          size="sm"
                          icon={<LuStar size={11} color="#B06000" />}
                        />
                      )}

                      {/* Delhivery Registered Badge */}
                      {isRegistered && (
                        <StatusBadge
                          intent="positive"
                          label="Delhivery Registered"
                          size="sm"
                          icon={<LuCheck size={11} color="#047857" />}
                        />
                      )}
                    </XStack>

                    {/* Action Buttons (Edit & Delete) */}
                    <XStack alignItems="center" gap={6}>
                      {onEditFacility && (
                        <Pressable
                          onPress={() => onEditFacility(warehouse)}
                          style={({ pressed }) => [
                            {
                              padding: 6,
                              borderRadius: radiusMd,
                              backgroundColor: surfaceRaised,
                              borderWidth: 1,
                              borderColor: borderColor,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${warehouse.name}`}
                        >
                          <LuPencil size={14} color={textSecondary} />
                        </Pressable>
                      )}

                      {onDeleteFacility && (
                        <Pressable
                          onPress={() => onDeleteFacility(warehouse)}
                          style={({ pressed }) => [
                            {
                              padding: 6,
                              borderRadius: radiusMd,
                              backgroundColor: surfaceRaised,
                              borderWidth: 1,
                              borderColor: borderColor,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${warehouse.name}`}
                        >
                          <LuTrash2 size={14} color="#EF4444" />
                        </Pressable>
                      )}
                    </XStack>
                  </XStack>

                  {/* Address Section */}
                  <XStack alignItems="flex-start" gap={8}>
                    <YStack marginTop={2}>
                      <LuMapPin size={15} color={textSecondary} />
                    </YStack>
                    <YStack flex={1} gap={2}>
                      {(addressLine1 || addressLine2) && (
                        <Text fontSize={13} lineHeight={18} color={textColor}>
                          {addressLine1}
                          {addressLine2 ? `, ${addressLine2}` : ''}
                        </Text>
                      )}
                      <Text fontSize={12} fontWeight="600" color={textSecondary}>
                        {[warehouse.city, warehouse.state].filter(Boolean).join(', ')}
                        {warehouse.pincode ? ` - ${warehouse.pincode}` : ''}
                      </Text>
                    </YStack>
                  </XStack>

                  {/* Divider */}
                  <YStack height={1} backgroundColor={borderColor} width="100%" />

                  {/* Contact & Status Details Footer */}
                  <XStack
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={12}
                  >
                    <XStack alignItems="center" flexWrap="wrap" gap={16}>
                      {/* Contact Person */}
                      <XStack alignItems="center" gap={5}>
                        <LuUser size={13} color={textMuted} />
                        <Text fontSize={12} color={textSecondary}>
                          Contact:
                        </Text>
                        <Text fontSize={12} fontWeight="600" color={textColor}>
                          {contactPerson || 'N/A'}
                        </Text>
                      </XStack>

                      {/* Phone with Tap-to-call */}
                      <Pressable
                        onPress={() => {
                          if (warehouse.phone) {
                            Linking.openURL(`tel:${warehouse.phone}`).catch(() => {});
                          }
                        }}
                        style={({ pressed }) => [
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            opacity: pressed && warehouse.phone ? 0.7 : 1,
                          },
                        ]}
                      >
                        <LuPhone size={13} color={textMuted} />
                        <Text fontSize={12} color={textSecondary}>
                          Phone:
                        </Text>
                        <Text
                          fontSize={12}
                          fontWeight="600"
                          color={warehouse.phone ? textColor : textMuted}
                          style={
                            warehouse.phone && Platform.OS === 'web'
                              ? ({ textDecorationLine: 'underline' } as any)
                              : {}
                          }
                        >
                          {warehouse.phone || 'N/A'}
                        </Text>
                      </Pressable>
                    </XStack>

                    {/* Active Status Indicator */}
                    <XStack alignItems="center" gap={5}>
                      <YStack
                        width={7}
                        height={7}
                        borderRadius={radiusFull}
                        backgroundColor={warehouse.isActive !== false ? '#10B981' : '#94A3B8'}
                      />
                      <Text fontSize={11} fontWeight="600" color={textSecondary}>
                        {warehouse.isActive !== false ? 'Active' : 'Inactive'}
                      </Text>
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
