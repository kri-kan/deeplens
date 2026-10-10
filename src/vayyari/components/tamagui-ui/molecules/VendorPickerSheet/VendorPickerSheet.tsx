import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSearch,
  LuX,
  LuBuilding2,
  LuStar,
  LuCheck,
  LuLock,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { vendorService } from '@/services/vendorService';

export interface VendorOption {
  id: string;
  name: string;
  code?: string;
  isStarred?: boolean;
}

export const STANDARD_VENDORS: VendorOption[] = [
  { id: 'v-inhouse', name: 'In-House', isStarred: true },
];

const STARRED_NAMES = new Set([
  'In-House',
]);

export interface VendorPickerSheetProps {
  visible: boolean;
  selectedVendor?: string;
  lockedVendors?: string[];
  originalVendor?: string;
  onSelect: (vendorName: string) => void;
  onClose: () => void;
}

export function VendorPickerSheet({
  visible,
  selectedVendor,
  lockedVendors = [],
  originalVendor,
  onSelect,
  onClose,
}: VendorPickerSheetProps) {
  const { tokens } = useTheme();
  const [vendors, setVendors] = useState<VendorOption[]>(STANDARD_VENDORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setLoading(true);

    async function fetchVendors() {
      try {
        const res = await vendorService.listVendors(1, 100);
        if (!isMounted) return;

        if (res && res.vendors && res.vendors.length > 0) {
          const list: VendorOption[] = res.vendors.map((v) => ({
            id: v.id,
            name: v.vendorName,
            code: v.vendorCode,
            isStarred: Boolean(
              v.isStarred ||
              v.isFavorite ||
              (v as any).is_favorite ||
              STARRED_NAMES.has(v.vendorName)
            ),
          }));

          // Merge In-House standard fallback option if not already present
          for (const std of STANDARD_VENDORS) {
            if (!list.some((item) => item.name.toLowerCase() === std.name.toLowerCase())) {
              list.push(std);
            }
          }

          setVendors(list);
        } else {
          setVendors(STANDARD_VENDORS);
        }
      } catch (err) {
        console.warn('Failed to fetch vendors from vendorService, using fallback:', err);
        if (isMounted) {
          setVendors(STANDARD_VENDORS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchVendors();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Reset search when sheet closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const filteredAndSortedVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? vendors.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            (v.code && v.code.toLowerCase().includes(q))
        )
      : vendors;

    return [...filtered].sort((a, b) => {
      const aStarred = Boolean(a.isStarred);
      const bStarred = Boolean(b.isStarred);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [vendors, searchQuery]);

  const hasExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return vendors.some((v) => v.name.toLowerCase() === q);
  }, [vendors, searchQuery]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Select Vendor"
      zIndex={300}
      maxHeight="85%"
      paddingHorizontal={16}
    >
      <YStack gap={12} maxHeight={520}>
        {/* Search Bar */}
        <XStack
          alignItems="center"
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.sm}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={10}
          height={40}
          gap={8}
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            accessibilityLabel="Search vendors"
            placeholder="Search vendors..."
            placeholderTextColor={tokens.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              fontSize: 14,
              color: tokens.text,
              paddingVertical: 0,
              paddingHorizontal: 0,
              outlineStyle: 'none',
            } as any}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery('')}
              hitSlop={8}
            >
              <LuX size={15} color={tokens.textMuted} />
            </Pressable>
          )}
        </XStack>

        {/* Vendors List */}
        {loading ? (
          <YStack height={180} alignItems="center" justifyContent="center" gap={8}>
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text fontSize={12} color={tokens.textMuted}>
              Loading vendors...
            </Text>
          </YStack>
        ) : (
          <ScrollView
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ gap: 6, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Custom search option if no exact match */}
            {searchQuery.trim().length > 0 && !hasExactMatch && (() => {
              const customName = searchQuery.trim();
              const isCustomLocked = Boolean(
                lockedVendors &&
                lockedVendors.some((lv) => lv.toLowerCase() === customName.toLowerCase()) &&
                (!originalVendor || originalVendor.trim().toLowerCase() !== customName.toLowerCase())
              );

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${customName} as vendor`}
                  onPress={() => {
                    if (isCustomLocked) {
                      Alert.alert(
                        'Package Locked',
                        `Cannot assign items to package "${customName}". It is already locked (shipping label generated or reached placed/delivered).`
                      );
                      return;
                    }
                    onSelect(customName);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.surfaceRaised,
                    borderWidth: 1,
                    borderColor: isCustomLocked ? tokens.border : tokens.accent,
                    borderStyle: 'dashed',
                    opacity: isCustomLocked ? 0.6 : pressed ? 0.75 : 1,
                  })}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8} flex={1}>
                      {isCustomLocked ? (
                        <LuLock size={16} color={tokens.textMuted} />
                      ) : (
                        <LuBuilding2 size={16} color={tokens.accent} />
                      )}
                      <Text
                        fontSize={13}
                        fontWeight="700"
                        color={isCustomLocked ? tokens.textMuted : tokens.accent}
                        numberOfLines={1}
                      >
                        Use "{customName}" as custom vendor {isCustomLocked ? '(Locked)' : ''}
                      </Text>
                    </XStack>
                  </XStack>
                </Pressable>
              );
            })()}

            {filteredAndSortedVendors.map((item) => {
              const isSelected = selectedVendor?.trim() === item.name.trim();
              const isItemLocked = Boolean(
                lockedVendors &&
                lockedVendors.some((lv) => lv.toLowerCase() === item.name.trim().toLowerCase()) &&
                (!originalVendor || originalVendor.trim().toLowerCase() !== item.name.trim().toLowerCase())
              );

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => {
                    if (isItemLocked) {
                      Alert.alert(
                        'Package Locked',
                        `Cannot assign items to package "${item.name}". It is already locked (shipping label generated or reached placed/delivered).`
                      );
                      return;
                    }
                    onSelect(item.name);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: isSelected
                      ? tokens.surfaceRaised
                      : pressed
                      ? tokens.surfaceRaised
                      : 'transparent',
                    borderWidth: 1,
                    borderColor: isSelected ? tokens.accent : tokens.border,
                    opacity: isItemLocked ? 0.55 : pressed ? 0.75 : 1,
                  })}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8} flex={1} flexWrap="wrap">
                      <Text
                        fontSize={14}
                        fontWeight={isSelected ? '800' : item.isStarred ? '700' : '500'}
                        color={isItemLocked ? tokens.textMuted : isSelected ? tokens.accent : tokens.text}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.code ? (
                        <Text
                          fontSize={12}
                          fontWeight="500"
                          color={tokens.textMuted}
                          numberOfLines={1}
                        >
                          ({item.code})
                        </Text>
                      ) : null}
                      {isItemLocked && (
                        <YStack
                          backgroundColor={`${tokens.textMuted}1A`}
                          paddingHorizontal={6}
                          paddingVertical={1}
                          borderRadius={4}
                        >
                          <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                            Locked
                          </Text>
                        </YStack>
                      )}
                      {!isItemLocked && item.isStarred && (
                        <YStack
                          backgroundColor="rgba(245, 158, 11, 0.12)"
                          paddingHorizontal={6}
                          paddingVertical={1}
                          borderRadius={4}
                        >
                          <Text fontSize={10} fontWeight="700" color="#D97706">
                            Starred
                          </Text>
                        </YStack>
                      )}
                    </XStack>

                    {isSelected && <LuCheck size={16} color={tokens.accent} />}
                  </XStack>
                </Pressable>
              );
            })}

            {filteredAndSortedVendors.length === 0 && (
              <YStack paddingVertical={24} alignItems="center">
                <Text fontSize={13} color={tokens.textMuted}>
                  No vendors found matching "{searchQuery}"
                </Text>
              </YStack>
            )}

            {/* Clear selection option if a vendor is currently selected */}
            {selectedVendor && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear vendor assignment"
                onPress={() => {
                  onSelect('');
                  onClose();
                }}
                style={({ pressed }) => ({
                  marginTop: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
                  Clear Vendor Assignment
                </Text>
              </Pressable>
            )}
          </ScrollView>
        )}
      </YStack>
    </BottomSheet>
  );
}
