import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSearch,
  LuX,
  LuBuilding2,
  LuStar,
  LuCheck,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';

export interface VendorOption {
  id: string;
  name: string;
  code?: string;
  isStarred?: boolean;
}

export const STANDARD_VENDORS: VendorOption[] = [
  { id: 'v-inhouse', name: 'In-House', isStarred: true },
  { id: 'v-varanasi', name: 'Varanasi Weavers Ltd', isStarred: true },
  { id: 'v-surat', name: 'Surat Handlooms Factory #2', isStarred: true },
  { id: 'v-kanchipuram', name: 'Kanchipuram Silks Co', isStarred: false },
  { id: 'v-chanderi', name: 'Chanderi Crafts Guild', isStarred: false },
  { id: 'v-jaipur', name: 'Jaipur Block Printers', isStarred: false },
];

export interface VendorPickerSheetProps {
  visible: boolean;
  selectedVendor?: string;
  onSelect: (vendorName: string) => void;
  onClose: () => void;
}

export function VendorPickerSheet({
  visible,
  selectedVendor,
  onSelect,
  onClose,
}: VendorPickerSheetProps) {
  const { tokens } = useTheme();
  const [vendors, setVendors] = useState<VendorOption[]>(STANDARD_VENDORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);

    // Resilient async load simulation / mock matching vendorService.listVendors(1, 100)
    const timer = setTimeout(() => {
      setVendors(STANDARD_VENDORS);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
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
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
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
            {searchQuery.trim().length > 0 && !hasExactMatch && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use ${searchQuery.trim()} as vendor`}
                onPress={() => {
                  onSelect(searchQuery.trim());
                  onClose();
                }}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.surfaceRaised,
                  borderWidth: 1,
                  borderColor: tokens.accent,
                  borderStyle: 'dashed',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={8} flex={1}>
                    <LuBuilding2 size={16} color={tokens.accent} />
                    <Text fontSize={13} fontWeight="700" color={tokens.accent} numberOfLines={1}>
                      Use "{searchQuery.trim()}" as custom vendor
                    </Text>
                  </XStack>
                </XStack>
              </Pressable>
            )}

            {filteredAndSortedVendors.map((item) => {
              const isSelected = selectedVendor?.trim() === item.name.trim();

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => {
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
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={10} flex={1}>
                      {item.isStarred ? (
                        <LuStar size={16} color="#F59E0B" style={{ fill: '#F59E0B' } as any} />
                      ) : (
                        <LuBuilding2 size={16} color={tokens.textMuted} />
                      )}
                      <YStack flex={1}>
                        <XStack alignItems="center" gap={6}>
                          <Text
                            fontSize={14}
                            fontWeight={isSelected ? '800' : item.isStarred ? '700' : '500'}
                            color={isSelected ? tokens.accent : tokens.text}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.isStarred && (
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
                        {item.code ? (
                          <Text fontSize={11} color={tokens.textMuted}>
                            {item.code}
                          </Text>
                        ) : null}
                      </YStack>
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
