import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { SizeSelector } from '../../components/organisms/SizeSelector/SizeSelector';
import {
  LETTER_SIZE_PRESET,
  BLOUSE_NUMERIC_PRESET,
  KIDS_SIZE_PRESET,
  FREE_SIZE_PRESET,
} from '../../data/catalog/sizePresets';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/SizeSelector',
  component: SizeSelector,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

/**
 * 1. Standard Letter Sizes (XS, S, M, L, XL, 2XL, 3XL)
 * Used for Stitched Kurtas, Anarkalis, Gowns, and Ready Dresses.
 */
export const StandardLetter = (args: any) => {
  const [selected, setSelected] = useState('M');
  return (
    <YStack padding={20} gap={16} maxWidth={440}>
      <Text fontSize={14} fontWeight="800" color="#757575">
        DRESSES & KURTIS (Letter Sizes)
      </Text>
      <SizeSelector
        variant="letter"
        sizes={LETTER_SIZE_PRESET}
        selected={selected}
        onSelect={setSelected}
        disabled={['XS', '3XL']}
        customNotes="Relaxed regular fit. Side seam includes 1.5-inch alteration margin."
      />
    </YStack>
  );
};

/**
 * 2. Stitched Blouse Numeric Sizes (32, 34, 36, 38, 40, 42, 44)
 * Used for Readymade Designer and Brocade Blouses with bust inch measurements.
 */
export const BlouseNumeric = (args: any) => {
  const [selected, setSelected] = useState('36');
  return (
    <YStack padding={20} gap={16} maxWidth={440}>
      <Text fontSize={14} fontWeight="800" color="#757575">
        STITCHED BLOUSES (Bust Inches 32 - 44)
      </Text>
      <SizeSelector
        variant="numeric"
        sizes={BLOUSE_NUMERIC_PRESET}
        selected={selected}
        onSelect={setSelected}
        disabled={['32', '44']}
        customNotes="Padded cups with 2-inch interior seam margins for custom letting out."
      />
    </YStack>
  );
};

/**
 * 3. Kids Age-Based & Number Sizes (16 [6M] to 36 [15-16Y])
 * Derived directly from Admin Order Form / QuickPickerSheet for kids ethnic wear.
 */
export const KidsAgeBased = (args: any) => {
  const [selected, setSelected] = useState('22');
  return (
    <YStack padding={20} gap={16} maxWidth={520}>
      <Text fontSize={14} fontWeight="800" color="#757575">
        KIDS ETHNIC WEAR (6 Months to 16 Years)
      </Text>
      <SizeSelector
        variant="kids"
        category="kids"
        sizes={KIDS_SIZE_PRESET}
        selected={selected}
        onSelect={setSelected}
        disabled={['16', '36']}
        customNotes="Elasticated back waistband with drawstrings for growing children."
      />
    </YStack>
  );
};

/**
 * 4. Free Size / Unstitched Garment
 * Used for Sarees (5.5m + 0.8m Blouse) and Unstitched Dress Material.
 */
export const FreeSizeUnstitched = (args: any) => {
  const [selected, setSelected] = useState('free_size');
  return (
    <YStack padding={20} gap={16} maxWidth={440}>
      <Text fontSize={14} fontWeight="800" color="#757575">
        SAREES & DRESS MATERIAL (Free Size)
      </Text>
      <SizeSelector
        variant="free-size"
        category="saree"
        sizes={FREE_SIZE_PRESET}
        selected={selected}
        onSelect={setSelected}
        customNotes="Standard 5.5m drape with 0.8m attached unstitched blouse fabric."
      />
    </YStack>
  );
};

/**
 * 5. Out of Stock & Urgency Badges
 * Shows disabled cross-out styling and urgency micro-badges ('Only 2 left').
 */
export const UrgencyAndStockBadges = (args: any) => {
  const [selected, setSelected] = useState('M');
  const sizesWithBadges = [
    { id: 'XS', label: 'XS', subtitle: 'Bust 32"', disabled: true },
    { id: 'S', label: 'S', subtitle: 'Bust 34"', badge: 'Few Left' },
    { id: 'M', label: 'M', subtitle: 'Bust 36"', badge: 'Popular' },
    { id: 'L', label: 'L', subtitle: 'Bust 38"', disabled: true },
    { id: 'XL', label: 'XL', subtitle: 'Bust 40"', badge: '1 left' },
    { id: '2XL', label: '2XL', subtitle: 'Bust 42"', disabled: true },
  ];

  return (
    <YStack padding={20} gap={16} maxWidth={440}>
      <Text fontSize={14} fontWeight="800" color="#757575">
        STOCK & BADGE BEHAVIOR
      </Text>
      <SizeSelector
        variant="letter"
        sizes={sizesWithBadges}
        selected={selected}
        onSelect={setSelected}
        customNotes="Sizes marked with line-through are currently sold out."
      />
    </YStack>
  );
};
