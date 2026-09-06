import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuCheck, LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface AdminProductEditSheetProps {
  visible: boolean;
  initialCategory?: string;
  initialFabric?: string;
  initialPrice?: number;
  initialUseForTraining?: boolean;
  categoryOptions?: { id: string; label: string }[];
  onClose: () => void;
  onSave: (updates: {
    category?: string;
    fabric?: string;
    price?: number;
    useForTraining?: boolean;
  }) => void;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'general', label: 'Others' },
];

export function AdminProductEditSheet({
  visible,
  initialCategory = 'general',
  initialFabric = '',
  initialPrice,
  initialUseForTraining = true,
  categoryOptions = DEFAULT_CATEGORY_OPTIONS,
  onClose,
  onSave,
}: AdminProductEditSheetProps) {
  const { tokens } = useTheme();

  const [category, setCategory] = useState(initialCategory);
  const [fabric, setFabric] = useState(initialFabric);
  const [priceStr, setPriceStr] = useState(initialPrice ? String(initialPrice) : '');
  const [useForTraining, setUseForTraining] = useState(initialUseForTraining);

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory || 'general');
      setFabric(initialFabric || '');
      setPriceStr(initialPrice !== undefined && initialPrice !== null ? String(initialPrice) : '');
      setUseForTraining(initialUseForTraining ?? true);
    }
  }, [visible, initialCategory, initialFabric, initialPrice, initialUseForTraining]);

  if (!visible) return null;

  const handleSave = () => {
    const numPrice = parseFloat(priceStr);
    onSave({
      category,
      fabric: fabric.trim() || undefined,
      price: !isNaN(numPrice) ? numPrice : undefined,
      useForTraining,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <XStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        {/* Dismissable Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <XStack flex={1} />
        </TouchableWithoutFeedback>

        {/* Slide-Up Bottom Sheet Surface */}
        <YStack
          width="100%"
          maxHeight="80%"
          backgroundColor={tokens.surface}
          borderTopLeftRadius={tokens.radius.xl}
          borderTopRightRadius={tokens.radius.xl}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.2}
          shadowRadius={16}
          elevation={16}
        >
          {/* Grab Handle */}
          <XStack justifyContent="center" paddingTop={10} paddingBottom={4}>
            <YStack
              width={36}
              height={4}
              borderRadius={2}
              backgroundColor={tokens.border}
            />
          </XStack>

          {/* Header */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={12}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              Edit Product Metadata
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close edit sheet"
              onPress={onClose}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={28}
                height={28}
                borderRadius={14}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuX size={15} color={tokens.text} />
              </XStack>
            </Pressable>
          </XStack>

          {/* Form Fields Scroll */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Price Input */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                Vendor Price (₹)
              </Text>
              <XStack
                height={42}
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.border}
                backgroundColor={tokens.surfaceRaised}
                paddingHorizontal={12}
                alignItems="center"
              >
                <TextInput
                  keyboardType="numeric"
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="e.g. 2450"
                  placeholderTextColor={tokens.textMuted}
                  style={
                    {
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '700',
                      color: tokens.text,
                      outlineStyle: 'none',
                    } as any
                  }
                />
              </XStack>
            </YStack>

            {/* Category Picker */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                Category Tag
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {categoryOptions.map((opt) => {
                  const isSelected = category.toLowerCase() === opt.id.toLowerCase();
                  return (
                    <Pressable
                      key={opt.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Select category ${opt.label}`}
                      onPress={() => setCategory(opt.id)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        paddingHorizontal={12}
                        paddingVertical={7}
                        borderRadius={tokens.radius.full}
                        backgroundColor={isSelected ? tokens.accent : tokens.surfaceRaised}
                        borderWidth={1}
                        borderColor={isSelected ? tokens.accent : tokens.border}
                      >
                        <Text
                          fontSize={12}
                          fontWeight={isSelected ? '800' : '600'}
                          color={isSelected ? '#ffffff' : tokens.text}
                        >
                          {opt.label}
                        </Text>
                      </XStack>
                    </Pressable>
                  );
                })}
              </XStack>
            </YStack>

            {/* Fabric Input */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                Fabric / Material
              </Text>
              <XStack
                height={42}
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.border}
                backgroundColor={tokens.surfaceRaised}
                paddingHorizontal={12}
                alignItems="center"
              >
                <TextInput
                  value={fabric}
                  onChangeText={setFabric}
                  placeholder="e.g. Pure Katan Silk"
                  placeholderTextColor={tokens.textMuted}
                  style={
                    {
                      flex: 1,
                      fontSize: 13,
                      fontWeight: '600',
                      color: tokens.text,
                      outlineStyle: 'none',
                    } as any
                  }
                />
              </XStack>
            </YStack>

            {/* AI Training Flag */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle AI Training"
              onPress={() => setUseForTraining(!useForTraining)}
              style={{ cursor: 'pointer', marginTop: 4 } as any}
            >
              <XStack
                alignItems="center"
                justifyContent="space-between"
                padding={12}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={tokens.border}
              >
                <XStack alignItems="center" gap={8} flex={1}>
                  <LuSparkles size={16} color={tokens.accent} />
                  <YStack gap={1}>
                    <Text fontSize={13} fontWeight="700" color={tokens.text}>
                      Use for AI Training
                    </Text>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Enriches image captioning and vision model weights
                    </Text>
                  </YStack>
                </XStack>

                <XStack
                  width={20}
                  height={20}
                  borderRadius={tokens.radius.xs}
                  borderWidth={1.5}
                  borderColor={useForTraining ? tokens.accent : tokens.border}
                  backgroundColor={useForTraining ? tokens.accent : 'transparent'}
                  alignItems="center"
                  justifyContent="center"
                >
                  {useForTraining && <LuCheck size={14} color="#ffffff" />}
                </XStack>
              </XStack>
            </Pressable>
          </ScrollView>

          {/* Action Footer */}
          <XStack
            height={56}
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={14}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            gap={10}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
              onPress={onClose}
              style={{ flex: 1, cursor: 'pointer' } as any}
            >
              <XStack
                height={40}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  Cancel
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save metadata changes"
              onPress={handleSave}
              style={{ flex: 1.5, cursor: 'pointer' } as any}
            >
              <XStack
                height={40}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                gap={6}
              >
                <LuCheck size={16} color="#ffffff" />
                <Text fontSize={13} fontWeight="800" color="#ffffff">
                  Save Changes
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </YStack>
      </XStack>
    </Modal>
  );
}
