import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuRuler } from 'react-icons/lu';
import { SizeChartModal } from '../../components/organisms/SizeChart/SizeChartModal';
import {
  SAREE_DRAPE_CHART,
  FREE_SIZE_STITCHED_BLOUSE_CHART,
  WOMEN_BLOUSE_CHART,
  KURTI_ANARKALI_CHART,
  KIDS_WEAR_CHART,
  LEHENGA_CHOLI_CHART,
} from '../../data/catalog/sizePresets';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/Size Chart Modal',
  component: SizeChartModal,
  args: {
    ...THEME_ARGS,
    visible: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof SizeChartModal>;

/** Interactive wrapper allowing opening and closing of the modal */
function SizeChartInteractiveDemo({
  data,
  category,
  variant,
  noSizeVariant,
  selectedSizeDefault = '36',
}: {
  data: any;
  category?: string;
  variant?: any;
  noSizeVariant?: any;
  selectedSizeDefault?: string;
}) {
  const [open, setOpen] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>(selectedSizeDefault);

  return (
    <YStack flex={1} minHeight={500} width="100%" alignItems="center" justifyContent="center" padding={20}>
      {/* External Controls Card */}
      <YStack
        width="100%"
        maxWidth={500}
        backgroundColor="#1E293B"
        borderRadius={14}
        padding={16}
        gap={12}
        borderWidth={1}
        borderColor="#334155"
        shadowColor="#000"
        shadowOpacity={0.2}
        shadowRadius={12}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap={2}>
            <Text fontSize={13} fontWeight="800" color="#FFFFFF">
              {data.title}
            </Text>
            <Text fontSize={11} color="#94A3B8">
              Selected Size: <Text fontWeight="800" color="#D4AF37">{selectedSize || 'None'}</Text>
            </Text>
          </YStack>

          <Pressable
            onPress={() => setOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: '#D4AF37',
            }}
          >
            <LuRuler size={14} color="#0F172A" />
            <Text fontSize={11} fontWeight="800" color="#0F172A">
              Open Chart
            </Text>
          </Pressable>
        </XStack>
      </YStack>

      <SizeChartModal
        visible={open}
        onClose={() => setOpen(false)}
        data={data}
        category={category}
        variant={variant}
        noSizeVariant={noSizeVariant}
        selectedSize={selectedSize}
        onSelectSize={(s) => setSelectedSize(s)}
      />
    </YStack>
  );
}

/** 1. Saree & Drape Specifications (Universal One Size) */
export const SareeDrapeSpecifications: Story = {
  name: '1. Saree & Drape Specifications (Universal One Size)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={SAREE_DRAPE_CHART}
      category="saree"
      variant="no-size"
      noSizeVariant="one-size"
      selectedSizeDefault="One Size"
    />
  ),
};

/** 2. Free Size Stitched Blouse (Alterable Fit 34"-42") */
export const FreeSizeStitchedBlouse: Story = {
  name: '2. Free Size Stitched Blouse (Alterable 34"–42")',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={FREE_SIZE_STITCHED_BLOUSE_CHART}
      category="blouse"
      variant="no-size"
      noSizeVariant="free-size"
      selectedSizeDefault="Free Size"
    />
  ),
};

/** 3. Women's Stitched Blouses (Numeric Bust 32 – 44) */
export const WomensStitchedBlouseNumeric: Story = {
  name: '3. Stitched Blouse (Numeric Bust 32"–44" + 2" Margin)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={WOMEN_BLOUSE_CHART}
      category="blouse"
      variant="numeric"
      selectedSizeDefault="36"
    />
  ),
};

/** 4. Kurtis, Anarkalis & Ethnic Dresses (Letter XS – 3XL) */
export const KurtiAndAnarkaliLetterSizes: Story = {
  name: '4. Kurtis & Anarkalis (Letter XS–3XL with Flare)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={KURTI_ANARKALI_CHART}
      category="dress"
      variant="letter"
      selectedSizeDefault="M"
    />
  ),
};

/** 5. Kids Ethnic Wear (Sizes 16 – 36 / 0 – 16 Years) */
export const KidsEthnicWearSizeChart: Story = {
  name: '5. Kids Ethnic Wear (0–16 Years with Child Height)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={KIDS_WEAR_CHART}
      category="kids"
      variant="kids"
      selectedSizeDefault="24"
    />
  ),
};

/** 6. Semi-Stitched Lehenga Choli (Waist 28" – 42" & Cancan) */
export const SemiStitchedLehengaCholi: Story = {
  name: '6. Semi-Stitched Lehenga Choli (Waist 28"–42" & Cancan)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={LEHENGA_CHOLI_CHART}
      category="lehenga"
      variant="custom"
      selectedSizeDefault="Free Size"
    />
  ),
};

/** 7. Form Factor: Mobile BottomSheet View */
export const FormFactorMobileBottomSheet: Story = {
  name: '7. Form Factor: Mobile BottomSheet (Drag Handle & Tabs)',
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={WOMEN_BLOUSE_CHART}
      category="blouse"
      variant="numeric"
      selectedSizeDefault="34"
    />
  ),
};

/** 8. Form Factor: Tablet Centered Dialog View */
export const FormFactorTabletDialog: Story = {
  name: '8. Form Factor: Tablet Centered Dialog (Backdrop Blur)',
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={KURTI_ANARKALI_CHART}
      category="dress"
      variant="letter"
      selectedSizeDefault="L"
    />
  ),
};

/** 9. Form Factor: Desktop Dual-Column Split View */
export const FormFactorDesktopDualColumnSplit: Story = {
  name: '9. Form Factor: Desktop Dual-Column Split (Table + Silhouette)',
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  render: () => (
    <SizeChartInteractiveDemo
      data={WOMEN_BLOUSE_CHART}
      category="blouse"
      variant="numeric"
      selectedSizeDefault="38"
    />
  ),
};
