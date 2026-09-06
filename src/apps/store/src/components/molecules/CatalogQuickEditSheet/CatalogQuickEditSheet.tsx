import React, { useState, useEffect } from 'react';
import { Modal, Pressable, TextInput, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { ProductGridTileData } from '../ProductGridTile';

export interface CatalogQuickEditSheetProps {
  visible: boolean;
  onClose: () => void;
  product: ProductGridTileData | null;
  categories?: string[];
  onSave: (id: string, updates: { price?: number; category?: string }) => void;
}

const DEFAULT_CATEGORIES = ['saree', 'dress', 'lehanga', 'kids', 'general'];

export function CatalogQuickEditSheet({
  visible,
  onClose,
  product,
  categories = DEFAULT_CATEGORIES,
  onSave,
}: CatalogQuickEditSheetProps) {
  const { tokens } = useTheme();

  const [priceStr, setPriceStr] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  useEffect(() => {
    if (product) {
      setPriceStr(product.price ? product.price.toString() : '');
      setSelectedCat(product.category || 'general');
    }
  }, [product]);

  if (!visible || !product) return null;

  const handleSave = () => {
    const numPrice = parseFloat(priceStr);
    onSave(product.id, {
      price: isNaN(numPrice) ? undefined : numPrice,
      category: selectedCat,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: '100%' }}
        >
          <YStack
            backgroundColor={tokens.surface}
            borderTopLeftRadius={tokens.radius.xl}
            borderTopRightRadius={tokens.radius.xl}
            borderWidth={1}
            borderColor={tokens.border}
            padding={20}
            gap={16}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: -4 }}
            shadowOpacity={0.12}
            shadowRadius={16}
          >
            {/* Sheet Header */}
            <XStack alignItems="center" justifyContent="space-between">
              <YStack gap={2}>
                <Text fontSize={16} fontWeight="800" color={tokens.text}>
                  Quick Edit SKU
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {product.productCode || product.id}
                </Text>
              </YStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close quick edit"
                onPress={onClose}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack
                  width={30}
                  height={30}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuX size={16} color={tokens.text} />
                </XStack>
              </Pressable>
            </XStack>

            {/* Product Snapshot */}
            <XStack
              alignItems="center"
              gap={12}
              padding={10}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
            >
              {product.imageUri ? (
                <Image
                  source={{ uri: product.imageUri }}
                  style={{ width: 50, height: 50, borderRadius: 6 }}
                  resizeMode="cover"
                />
              ) : (
                <XStack
                  width={50}
                  height={50}
                  borderRadius={6}
                  backgroundColor={tokens.border}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={10} color={tokens.textMuted}>No Img</Text>
                </XStack>
              )}
              <YStack gap={2} flex={1}>
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  {product.title || product.productCode || 'Vendor Item'}
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Current: ₹{product.price ? product.price.toLocaleString('en-IN') : '0'} • {product.category || 'General'}
                </Text>
              </YStack>
            </XStack>

            {/* Price Field */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Vendor Price (₹)
              </Text>
              <XStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                paddingHorizontal={12}
                height={42}
                alignItems="center"
              >
                <TextInput
                  keyboardType="numeric"
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="Enter price in ₹"
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

            {/* Category Selector Chips */}
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Category
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {categories.map((cat) => {
                  const isCatActive = selectedCat.toLowerCase() === cat.toLowerCase();
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCat(cat)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        paddingVertical={6}
                        paddingHorizontal={12}
                        borderRadius={tokens.radius.full}
                        backgroundColor={isCatActive ? tokens.accent : tokens.surfaceRaised}
                        borderWidth={1}
                        borderColor={isCatActive ? tokens.accent : tokens.border}
                      >
                        <Text
                          fontSize={12}
                          fontWeight={isCatActive ? '800' : '600'}
                          color={isCatActive ? '#ffffff' : tokens.text}
                          textTransform="capitalize"
                        >
                          {cat}
                        </Text>
                      </XStack>
                    </Pressable>
                  );
                })}
              </XStack>
            </YStack>

            {/* Save Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save SKU changes"
              onPress={handleSave}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                backgroundColor={tokens.accent}
                height={44}
                borderRadius={tokens.radius.md}
                alignItems="center"
                justifyContent="center"
                gap={8}
                pressStyle={{ opacity: 0.85 }}
              >
                <LuCheck size={16} color="#ffffff" />
                <Text fontSize={14} fontWeight="800" color="#ffffff">
                  Save Changes
                </Text>
              </XStack>
            </Pressable>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
