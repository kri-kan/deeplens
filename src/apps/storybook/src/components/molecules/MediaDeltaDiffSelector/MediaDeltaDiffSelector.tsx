import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Image } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuSparkles, LuX, LuCheck, LuCircleAlert, LuTrash2 } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface DiffPhoto {
  id: string;
  url: string;
  filename?: string;
  status: 'added' | 'removed';
}

export interface MediaDeltaDiffSelectorProps {
  productCode: string;
  photos: DiffPhoto[];
  onConfirmSync: (selectedAddedIds: string[]) => void;
  onClose: () => void;
}

export function MediaDeltaDiffSelector({
  productCode,
  photos,
  onConfirmSync,
  onClose,
}: MediaDeltaDiffSelectorProps) {
  const { tokens } = useTheme();

  const addedPhotos = photos.filter((p) => p.status === 'added');
  const removedPhotos = photos.filter((p) => p.status === 'removed');

  // Default all added photos to checked
  const [selectedAdded, setSelectedAdded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    addedPhotos.forEach((p) => {
      init[p.id] = true;
    });
    return init;
  });

  const toggleSelect = (id: string) => {
    setSelectedAdded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = () => {
    const confirmedIds = Object.keys(selectedAdded).filter((id) => selectedAdded[id]);
    onConfirmSync(confirmedIds);
  };

  const selectedCount = Object.values(selectedAdded).filter(Boolean).length;

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      padding={16}
      gap={14}
      maxHeight={550}
    >
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={8}>
          <LuSparkles size={18} color="#D97706" />
          <YStack>
            <Text fontSize={15} fontWeight="800" color={tokens.text}>
              Catalog Media Updates ({productCode})
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Select newly added photos to publish. Unchecking applies to this sync only.
            </Text>
          </YStack>
        </XStack>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <LuX size={18} color={tokens.textMuted} />
        </TouchableOpacity>
      </XStack>

      <ScrollView style={{ maxHeight: 380 }}>
        <YStack gap={14}>
          {/* Newly Added Photos Section */}
          {addedPhotos.length > 0 && (
            <YStack gap={8}>
              <Text fontSize={12} fontWeight="800" color="#059669">
                + Newly Merged Photos ({addedPhotos.length})
              </Text>
              {addedPhotos.map((photo, idx) => {
                const isChecked = !!selectedAdded[photo.id];
                return (
                  <TouchableOpacity
                    key={photo.id}
                    onPress={() => toggleSelect(photo.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isChecked ? `${tokens.accent}0D` : tokens.surfaceRaised,
                      borderColor: isChecked ? tokens.accent : tokens.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 10,
                      gap: 12,
                    }}
                  >
                    {/* Checkbox */}
                    <XStack
                      width={20}
                      height={20}
                      borderRadius={4}
                      backgroundColor={isChecked ? tokens.accent : tokens.surface}
                      borderWidth={1}
                      borderColor={isChecked ? tokens.accent : tokens.border}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isChecked && <LuCheck size={14} color="#ffffff" />}
                    </XStack>

                    {/* Thumbnail */}
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#e2e8f0' }}
                    />

                    {/* Details */}
                    <YStack flex={1}>
                      <Text fontSize={12} fontWeight="700" color={tokens.text}>
                        Photo #{idx + 1}
                      </Text>
                      <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
                        {photo.filename || photo.url.split('/').pop()}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                );
              })}
            </YStack>
          )}

          {/* Pruned / Removed Photos Section */}
          {removedPhotos.length > 0 && (
            <YStack gap={8}>
              <XStack alignItems="center" gap={6}>
                <LuTrash2 size={14} color="#DC2626" />
                <Text fontSize={12} fontWeight="800" color="#DC2626">
                  Pruned from Catalog ({removedPhotos.length})
                </Text>
              </XStack>
              <XStack
                backgroundColor="#FEF2F2"
                borderColor="#FCA5A5"
                borderWidth={1}
                borderRadius={8}
                padding={10}
                gap={8}
                alignItems="center"
              >
                <LuCircleAlert size={14} color="#DC2626" />
                <Text fontSize={11} color="#991B1B" flex={1}>
                  These photos were unmerged or removed from the catalog. Syncing will remove them from the storefront.
                </Text>
              </XStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Footer CTA */}
      <XStack gap={10} justifyContent="flex-end">
        <TouchableOpacity
          onPress={onClose}
          style={{
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: tokens.surfaceRaised,
          }}
        >
          <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          style={{
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: tokens.accent,
          }}
        >
          <Text fontSize={12} fontWeight="800" color="#ffffff">
            Confirm & Sync Updates ({selectedCount} Selected)
          </Text>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
}
