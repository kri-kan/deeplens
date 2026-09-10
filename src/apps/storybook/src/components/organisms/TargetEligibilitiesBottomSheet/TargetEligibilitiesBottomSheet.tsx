import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles, LuSave, LuCheckCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { PlannedProductInfo, TargetChannelOption } from '../../molecules/post-planner.types';
import { TargetChannelEligibilityPicker } from '../../molecules/TargetChannelEligibilityPicker';

export interface TargetEligibilitiesBottomSheetProps {
  visible: boolean;
  product: PlannedProductInfo;
  channels: TargetChannelOption[];
  assignedChannelIds: string[];
  initialPlanningStatus?: 'complete' | 'in_progress';
  onSaveAffinity: (selectedChannelIds: string[], isComplete: boolean, groupName?: string, keywords?: string) => void;
  onDismiss: () => void;
}

export function TargetEligibilitiesBottomSheet({
  visible,
  product,
  channels,
  assignedChannelIds,
  onSaveAffinity,
  onDismiss,
}: TargetEligibilitiesBottomSheetProps) {
  const { tokens } = useTheme();
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedChannelIds);
  const [groupName, setGroupName] = useState(`${product.category.toUpperCase()} Collection - ${product.productCode}`);
  const [keywords, setKeywords] = useState(`${product.category}, ${product.fabric || 'Festive'}, Starred`);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    setSelectedIds(assignedChannelIds);
    setGroupName(`${product.category.toUpperCase()} Collection - ${product.productCode}`);
    setKeywords(`${product.category}, ${product.fabric || 'Festive'}, Starred`);
  }, [product.id, assignedChannelIds]);

  if (!visible) return null;

  const toggleChannel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAiSuggest = () => {
    setIsSuggesting(true);
    setTimeout(() => {
      setGroupName(`Trending ${product.fabric || ''} ${product.category} Edit`.trim());
      setKeywords(`wedding, festival, ${product.category}, ${product.fabric || 'silk'}, trending`);
      const suggested = channels.filter((c) => c.isSuggestedMatch).map((c) => c.id);
      if (suggested.length > 0) {
        setSelectedIds(Array.from(new Set([...selectedIds, ...suggested])));
      }
      setIsSuggesting(false);
    }, 400);
  };

  const footerContent = (
    <XStack gap={10} paddingTop={6}>
      {/* 1. Save (Keeps in Curation List) */}
      <Pressable
        onPress={() => onSaveAffinity(selectedIds, false, groupName, keywords)}
        disabled={selectedIds.length === 0}
        style={({ pressed }) => [
          styles.bottomBtn,
          {
            flex: 1,
            backgroundColor: pressed ? tokens.surfaceRaised : tokens.surface,
            borderColor: selectedIds.length > 0 ? tokens.border : `${tokens.border}80`,
            borderWidth: 1.5,
            opacity: selectedIds.length > 0 ? 1 : 0.5,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Save channel assignments and keep in curation list"
      >
        <XStack alignItems="center" gap={6} justifyContent="center">
          <LuSave size={15} color={tokens.text} />
          <Text fontSize={13} fontWeight="800" color={tokens.text} textAlign="center">
            Save
          </Text>
        </XStack>
      </Pressable>

      {/* 2. Complete (Marks Finished & Removes from Curation List) */}
      <Pressable
        onPress={() => onSaveAffinity(selectedIds, true, groupName, keywords)}
        disabled={selectedIds.length === 0}
        style={({ pressed }) => [
          styles.bottomBtn,
          {
            flex: 1.5,
            backgroundColor: selectedIds.length > 0 ? tokens.accent : tokens.border,
            opacity: pressed ? 0.9 : selectedIds.length > 0 ? 1 : 0.5,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Complete curation and mark ready for publishing"
      >
        <XStack alignItems="center" gap={6} justifyContent="center">
          <LuCheckCheck size={16} color={tokens.accentForeground} />
          <Text
            fontSize={13}
            fontWeight="800"
            color={selectedIds.length > 0 ? tokens.accentForeground : tokens.textMuted}
            textAlign="center"
          >
            Complete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Text>
        </XStack>
      </Pressable>
    </XStack>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title={`Target Eligibilities — ${product.productCode}`}
      zIndex={999}
      footer={footerContent}
    >
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        <YStack gap={14} paddingHorizontal={2}>
          {/* Campaign / Group Name Input with Compact AI Suggest on the right */}
          <YStack gap={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Group / Campaign Name
              </Text>
              <Pressable
                onPress={handleAiSuggest}
                hitSlop={6}
                disabled={isSuggesting}
                style={({ pressed }) => [
                  styles.aiSuggestCompactBtn,
                  {
                    backgroundColor: pressed ? `${tokens.accent}20` : `${tokens.accent}0E`,
                    borderColor: `${tokens.accent}60`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Suggest Title & Keywords with AI"
              >
                <XStack alignItems="center" gap={4}>
                  <LuSparkles size={11} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                    {isSuggesting ? 'Suggesting...' : 'AI Suggest'}
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
            <XStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              paddingHorizontal={12}
              height={40}
              alignItems="center"
            >
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Festive Silk Collection"
                placeholderTextColor={tokens.textMuted}
                style={styles.textInput}
              />
            </XStack>
          </YStack>

          {/* Keywords Input */}
          <YStack gap={6}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Keywords (comma-separated)
            </Text>
            <XStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              paddingHorizontal={12}
              height={40}
              alignItems="center"
            >
              <TextInput
                value={keywords}
                onChangeText={setKeywords}
                placeholder="e.g. wedding, silk, saree, festive"
                placeholderTextColor={tokens.textMuted}
                style={styles.textInput}
              />
            </XStack>
          </YStack>

          {/* Target Channel Eligibilities Molecule */}
          <TargetChannelEligibilityPicker
            channels={channels}
            selectedChannelIds={selectedIds}
            onToggleChannel={toggleChannel}
          />
        </YStack>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  aiSuggestCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  bottomBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
