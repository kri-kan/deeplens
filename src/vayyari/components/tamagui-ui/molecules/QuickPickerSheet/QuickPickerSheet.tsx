import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { SegmentedControl } from '../../atoms/SegmentedControl';
import { OptionChip } from '../../atoms/OptionChip';

export const SAREE_DRESS_SIZES = [
  'Free Size',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL',
  '4XL',
  '5XL',
];

export const KIDS_SIZES = [
  { size: '16', age: '6 Month', value: '16 (6M)', chest: '16"', length: '8"' },
  { size: '18', age: '1 Yrs', value: '18 (1Y)', chest: '18"', length: '9"' },
  { size: '20', age: '2 Yrs', value: '20 (2Y)', chest: '20"', length: '10"' },
  { size: '22', age: '3 Yrs', value: '22 (3Y)', chest: '22"', length: '11"' },
  { size: '24', age: '4 Yrs', value: '24 (4Y)', chest: '24"', length: '11"' },
  { size: '25', age: '5 Yrs', value: '25 (5Y)', chest: '25"', length: '12"' },
  { size: '26', age: '6 Yrs', value: '26 (6Y)', chest: '26"', length: '12"' },
  { size: '27', age: '7 Yrs', value: '27 (7Y)', chest: '27"', length: '13"' },
  { size: '28', age: '8 Yrs', value: '28 (8Y)', chest: '28"', length: '13"' },
  { size: '30', age: '9-10 Yrs', value: '30 (9-10Y)', chest: '30"', length: '14"' },
  { size: '32', age: '11-12 Yrs', value: '32 (11-12Y)', chest: '32"', length: '14"' },
  { size: '34', age: '13-14 Yrs', value: '34 (13-14Y)', chest: '34"', length: '15"' },
  { size: '36', age: '15-16 Yrs', value: '36 (15-16Y)', chest: '36"', length: '15"' },
];

export const QTY_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export interface QuickPickerSheetProps {
  visible: boolean;
  type: 'size' | 'qty';
  title?: string;
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}

export function QuickPickerSheet({
  visible,
  type,
  title,
  selected,
  onSelect,
  onClose,
}: QuickPickerSheetProps) {
  const { tokens } = useTheme();

  // Determine initial size category tab (saree vs kids) based on current value
  const isCurrentKids = React.useMemo(() => {
    if (!selected) return false;
    return KIDS_SIZES.some(
      (k) =>
        k.value === selected ||
        selected.startsWith(k.size) ||
        selected.toLowerCase().includes('y') ||
        selected.toLowerCase().includes('month')
    );
  }, [selected]);

  const [sizeCategory, setSizeCategory] = useState<'saree' | 'kids'>(isCurrentKids ? 'kids' : 'saree');

  React.useEffect(() => {
    if (visible && type === 'size') {
      setSizeCategory(isCurrentKids ? 'kids' : 'saree');
    }
  }, [visible, type, isCurrentKids]);

  const headerTitle = title || (type === 'size' ? 'Select Size' : 'Select Quantity');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={headerTitle}
      zIndex={300}
    >
      <YStack gap={10}>
        {/* Category Tabs (Only for Size picker) using SegmentedControl Atom */}
        {type === 'size' && (
          <SegmentedControl
            activeId={sizeCategory}
            onChange={(id) => setSizeCategory(id as 'saree' | 'kids')}
            options={[
              { id: 'saree', label: 'Sarees & Dresses' },
              { id: 'kids', label: 'Kids (0-15 Years)' },
            ]}
          />
        )}

        {/* Content: Quantity Picker using OptionChip Atom */}
        {type === 'qty' && (
          <XStack flexWrap="wrap" gap={8} paddingVertical={4}>
            {QTY_OPTIONS.map((opt) => (
              <OptionChip
                key={opt}
                label={opt}
                selected={opt === selected}
                paddingHorizontal={16}
                paddingVertical={8}
                onSelect={() => {
                  onSelect(opt);
                  onClose();
                }}
              />
            ))}
          </XStack>
        )}

        {/* Content: Size Picker — Sarees & Dresses using OptionChip Atom */}
        {type === 'size' && sizeCategory === 'saree' && (
          <YStack gap={8}>
            <Text fontSize={11} color={tokens.textMuted}>
              Standard adult and ethnic wear sizing:
            </Text>
            <XStack flexWrap="wrap" gap={8} paddingVertical={2}>
              {SAREE_DRESS_SIZES.map((opt) => (
                <OptionChip
                  key={opt}
                  label={opt}
                  selected={opt === selected}
                  onSelect={() => {
                    onSelect(opt);
                    onClose();
                  }}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Content: Size Picker — Kids 0-15 Years with Chart Intervals */}
        {type === 'size' && sizeCategory === 'kids' && (
          <YStack gap={6}>
            <Text fontSize={11} color={tokens.textMuted}>
              Lehenga-Choli & Kids ethnic wear (6 Month to 15 Years):
            </Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <XStack flexWrap="wrap" gap={6} paddingVertical={2}>
                {KIDS_SIZES.map((kid) => {
                  const isSelected =
                    kid.value === selected ||
                    selected === kid.size ||
                    selected.startsWith(`${kid.size} `);
                  return (
                    <Pressable
                      key={kid.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Size ${kid.size}, age ${kid.age}, chest ${kid.chest}`}
                      onPress={() => {
                        onSelect(kid.value);
                        onClose();
                      }}
                      style={{ width: '48%' }}
                    >
                      <XStack
                        paddingHorizontal={10}
                        paddingVertical={7}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1.5}
                        borderColor={isSelected ? tokens.accent : tokens.border}
                        backgroundColor={isSelected ? `${tokens.accent}14` : tokens.surface}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <YStack gap={1}>
                          <XStack alignItems="center" gap={4}>
                            <Text fontSize={12} fontWeight="800" color={tokens.text}>
                              Size {kid.size}
                            </Text>
                            <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                              ({kid.age})
                            </Text>
                          </XStack>
                          <Text fontSize={9} color={tokens.textMuted}>
                            Chest {kid.chest} · Len {kid.length}
                          </Text>
                        </YStack>
                        {isSelected && <LuCheck size={13} color={tokens.accent} />}
                      </XStack>
                    </Pressable>
                  );
                })}
              </XStack>
            </ScrollView>
          </YStack>
        )}
      </YStack>
    </BottomSheet>
  );
}
