import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, StyleSheet, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuSparkles,
  LuLayers,
  LuSlidersHorizontal,
  LuCheck,
} from 'react-icons/lu';
import { SpecificationsPanel } from '../../components/organisms/SpecificationsPanel/SpecificationsPanel';
import { SpecificationGroup, Spec } from '../../components/organisms/SpecificationsPanel/types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { FormFactorContext, FormFactor } from '../../theme';

// --- DATASETS FOR MULTI-CATEGORY APPAREL ---

// 1. Banarasi Silk Saree (The Canonical 14 Attributes across 3 Categories)
export const SAREE_14_FLAT_SPECS: Spec[] = [
  // Tab 1: Craft & Fabric (7)
  { label: 'Fabric Base', value: 'Pure Katan Silk (100% Mulberry)' },
  { label: 'Weave Technique', value: 'Kadwa Pitloom Weave (Double Jacquard)' },
  { label: 'Regional Craft Origin', value: 'Varanasi, Uttar Pradesh' },
  { label: 'Motif & Patterns', value: 'Floral Kadwa Bootis & Jangla Jaal' },
  { label: 'Border & Pallu Detail', value: 'Heavy Kadwa Zari Pallu with Scalloped Edge' },
  { label: 'Zari / Inlay Material', value: 'Tested Gold & Roop Silver Zari' },
  { label: 'Work Heaviness', value: 'Heavy Bridal Trousseau (1.18 kg)' },
  // Tab 3: Sizing & Drape (5)
  { label: 'Stitch & Sizing Profile', value: 'One Size (Universal Drape 5.5m)' },
  { label: 'Blouse Format', value: 'Attached Unstitched Running Blouse Piece' },
  { label: 'Saree Drape Length', value: '5.50 metres' },
  { label: 'Blouse Piece Length', value: '0.80 metres (80 cm unstitched)' },
  { label: 'Package Contents', value: '1 Saree with Attached Blouse Piece, 1 Muslin Bag' },
  // Tab 4: Occasions & Care (2)
  { label: 'Occasion & Styling', value: 'Wedding & Bridal, Grand Reception, Puja' },
  { label: 'Wash Care & Preservation', value: 'Dry Clean Only, Store in Muslin Bag' },
];

export const SAREE_GROUPED_SPECS: SpecificationGroup[] = [
  {
    id: 'craft-heritage',
    title: 'Craft & Handloom Heritage',
    subtitle: 'Pure mulberry yarn, kadwa pitloom weave & tested gold zari',
    badge: '7 Craft Attributes',
    icon: 'heritage',
    specs: [
      { label: 'Fabric Base', value: 'Pure Katan Silk (100% Mulberry Weave)' },
      { label: 'Weave Technique', value: 'Kadwa Pitloom Handloom Weave' },
      { label: 'Regional Craft Origin', value: 'Varanasi, Uttar Pradesh' },
      { label: 'Motif & Patterns', value: 'Floral Kadwa Bootis & Jangla Jaal' },
      { label: 'Border & Pallu Detail', value: 'Heavy Kadwa Zari Pallu with Scalloped Edge' },
      { label: 'Zari / Inlay Material', value: 'Tested Gold & Roop Silver Zari' },
      { label: 'Work Heaviness', value: 'Heavy Bridal Trousseau (1.18 kg)' },
    ],
  },
  {
    id: 'dimensions-tailoring',
    title: 'Garment Dimensions & Tailoring',
    subtitle: 'Universal saree drape, unstitched blouse allowance & packaging',
    badge: '5 Fit Attributes',
    icon: 'dimensions',
    specs: [
      { label: 'Stitch & Sizing Profile', value: 'One Size (Universal Drape 5.5m)' },
      { label: 'Blouse Format', value: 'Attached Unstitched Matching Running Fabric' },
      { label: 'Saree Drape Length', value: '5.50 metres (Standard Drape)' },
      { label: 'Blouse Piece Length', value: '0.80 metres (80 cm unstitched)' },
      { label: 'Package Contents', value: '1 Saree with Attached Blouse Piece, Muslin Preservation Bag' },
    ],
  },
  {
    id: 'occasions-care',
    title: 'Occasions & Fabric Care',
    subtitle: 'Ceremonial styling recommendations & heirloom textile preservation',
    badge: '2 Care Notes',
    icon: 'care',
    specs: [
      { label: 'Occasion & Styling', value: 'Wedding & Bridal, Grand Reception, Festive Puja' },
      { label: 'Wash Care & Preservation', value: 'Strictly Dry Clean Only, Store folded in muslin cloth, Avoid direct perfume spray' },
    ],
  },
];

// 2. Stitched Blouse (Numeric 32 - 44)
export const STITCHED_BLOUSE_GROUPED_SPECS: SpecificationGroup[] = [
  {
    id: 'craft-heritage',
    title: 'Fabric Craft & Lining',
    subtitle: 'Rich woven brocade outer with soft sweat-absorbing lining',
    badge: '5 Attributes',
    icon: 'heritage',
    specs: [
      { label: 'Outer Fabric', value: 'Banarasi Raw Silk Brocade' },
      { label: 'Weave Construction', value: 'Intricate Floral Jacquard Weave' },
      { label: 'Craft Origin', value: 'Varanasi Weaving Cluster' },
      { label: 'Inner Lining', value: '100% Breathable Pure Cotton Asthar' },
      { label: 'Embellishment', value: 'Hand Khatli Neck Border with Pearl Inlay' },
    ],
  },
  {
    id: 'dimensions-tailoring',
    title: 'Tailoring & Sizing Specs',
    subtitle: 'Numeric sizing, built-in bust padding & seam margins',
    badge: '6 Attributes',
    icon: 'scissors',
    specs: [
      { label: 'Available Sizes', value: 'Numeric 32, 34, 36, 38, 40, 42, 44' },
      { label: 'Active Size Shown', value: 'Size 38 (Bust 38" with 2" Margin)' },
      { label: 'Padding Type', value: 'Pre-Stitched Molded Foam Cups' },
      { label: 'Neck & Back Cut', value: 'Sweetheart Front & Deep Plunge Back with Dori' },
      { label: 'Opening Placket', value: 'Back Hook-and-Eye with Concealed Flap' },
      { label: 'Sleeve Length', value: '10.5 inches (Elbow Sleeve)' },
    ],
  },
  {
    id: 'occasions-care',
    title: 'Occasion & Garment Care',
    subtitle: 'Styling versatility and preservation guidance',
    badge: '2 Attributes',
    icon: 'care',
    specs: [
      { label: 'Recommended Occasions', value: 'Sangeet, Cocktail, Festive Puja, Bridal Bridesmaid' },
      { label: 'Garment Care', value: 'Dry Clean Only, Cool Iron on Reverse Side' },
    ],
  },
];

// 3. Kurti & Anarkali Suit Set (Letter XS - 3XL)
export const KURTI_ANARKALI_GROUPED_SPECS: SpecificationGroup[] = [
  {
    id: 'craft-heritage',
    title: 'Craft & Textile Heritage',
    subtitle: 'Fendy silk silhouette with organza dupatta',
    badge: '4 Attributes',
    icon: 'heritage',
    specs: [
      { label: 'Kurti Fabric', value: 'Fendy Silk Chanderi with Inner Cotton' },
      { label: 'Dupatta Fabric', value: 'Pure Organza with Scalloped Borders' },
      { label: 'Surface Ornamentation', value: 'High-Definition Digital Print with Gota Patti' },
      { label: 'Artisan Origin', value: 'Surat, Gujarat' },
    ],
  },
  {
    id: 'dimensions-tailoring',
    title: 'Silhouette & Dimensions',
    subtitle: 'Fit profile, 3.8m ghera flare & pant specifications',
    badge: '5 Attributes',
    icon: 'dimensions',
    specs: [
      { label: 'Sizing System', value: 'Letter XS, S, M, L, XL, 2XL, 3XL' },
      { label: 'Kurti Length', value: '52 inches (Ankle / Floor Length)' },
      { label: 'Flare / Ghera', value: '3.80 metres Full Circular Flare' },
      { label: 'Bottom Pant Style', value: 'Semi-Elasticated Cigarette Pant with Pocket' },
      { label: 'Dupatta Dimensions', value: '2.25m Length x 0.9m Width' },
    ],
  },
  {
    id: 'occasions-care',
    title: 'Occasions & Care',
    subtitle: 'Styling recommendations and wash guidelines',
    badge: '2 Attributes',
    icon: 'care',
    specs: [
      { label: 'Ideal Occasions', value: 'Festive Gatherings, Mehendi, Diwali, Family Celebrations' },
      { label: 'Care Instructions', value: 'Hand Wash Separately in Cold Water or Mild Dry Clean' },
    ],
  },
];

// 4. Kids Ethnic Wear (Pattu Pavadai Set / 6M - 16Y)
export const KIDS_WEAR_GROUPED_SPECS: SpecificationGroup[] = [
  {
    id: 'craft-heritage',
    title: 'Textile Craft & Sensitivity',
    subtitle: 'Artisan temple weave with ultra-soft hypoallergenic lining',
    badge: '4 Attributes',
    icon: 'heritage',
    specs: [
      { label: 'Garment Fabric', value: 'Pure Kanchi Art Silk Jacquard' },
      { label: 'Border Detail', value: 'Traditional Korvai Temple Border' },
      { label: 'Skin-Contact Lining', value: '100% Breathable Hypoallergenic Cotton' },
      { label: 'Craft Origin', value: 'Kanchipuram, Tamil Nadu' },
    ],
  },
  {
    id: 'dimensions-tailoring',
    title: 'Kids Sizing & Construction',
    subtitle: 'Growth margins, elastic waistband & zip closure',
    badge: '5 Attributes',
    icon: 'dimensions',
    specs: [
      { label: 'Size & Age Bracket', value: 'Size 24 (Fits 4 - 5 Years / Height 100-110cm)' },
      { label: 'Top Style', value: 'Peplum Top with Back Zip & Cotton Asthar' },
      { label: 'Skirt (Pavadai) Length', value: '24 inches with Elastic & Drawstring' },
      { label: 'Growth Seam Allowance', value: '1.5 inches alterable seam allowance inside' },
      { label: 'Package Contents', value: '1 Stitched Blouse, 1 Stitched Skirt' },
    ],
  },
  {
    id: 'occasions-care',
    title: 'Occasions & Gentle Care',
    subtitle: 'Comfortable festive wear & cleaning instructions',
    badge: '2 Attributes',
    icon: 'care',
    specs: [
      { label: 'Occasions', value: 'Temple Festivals, Onam, Pongal, School Ethnic Day, Weddings' },
      { label: 'Gentle Care', value: 'Hand Wash in Cold Water with Mild Detergent, Shade Dry' },
    ],
  },
];

// 5. Bridal Lehenga Choli (Semi-Stitched / Free Waist 28"-42")
export const BRIDAL_LEHENGA_GROUPED_SPECS: SpecificationGroup[] = [
  {
    id: 'craft-heritage',
    title: 'Artisanal Craft & Inlay',
    subtitle: 'Intricate multi-needle coding, zari dori & real mirror highlights',
    badge: '5 Attributes',
    icon: 'heritage',
    specs: [
      { label: 'Lehenga Fabric', value: 'Heavy Vichitra Silk with Micro Gold Sheen' },
      { label: 'Dupatta Fabric', value: 'Soft Butterfly Net with 4-Side Scalloped Lace' },
      { label: 'Embroidery Technique', value: 'Zari Dori & Multi-Needle Thread Coding' },
      { label: 'Embellishments', value: '3mm Micro Sequins & Real Foil Mirror Work' },
      { label: 'Work Heaviness', value: 'Grand Bridal Trousseau (3.20 kg Gross Weight)' },
    ],
  },
  {
    id: 'dimensions-tailoring',
    title: 'Silhouette & Tailoring Allowance',
    subtitle: 'Double cancan, dramatic 4.2m ghera & unstitched choli',
    badge: '6 Attributes',
    icon: 'scissors',
    specs: [
      { label: 'Stitch State', value: 'Semi-Stitched (Customizable to Waist 28" - 42")' },
      { label: 'Lehenga Length', value: '42 inches (Floor Length)' },
      { label: 'Flare / Ghera', value: '4.20 metres Dramatic Full Flare' },
      { label: 'Inner Flounce', value: 'Double Layer Micro-CanCan with Heavy Canvas Patta' },
      { label: 'Choli Piece Fabric', value: '1.00 metre Unstitched Heavy Embroidered Fabric' },
      { label: 'Dupatta Dimensions', value: '2.50 metres Length x 1.10 metres Width' },
    ],
  },
  {
    id: 'occasions-care',
    title: 'Occasions & Heirloom Care',
    subtitle: 'Bridal preservation and cleaning protocols',
    badge: '2 Attributes',
    icon: 'care',
    specs: [
      { label: 'Recommended Events', value: 'Bridal Pheras, Wedding Reception, Grand Sangeet' },
      { label: 'Preservation Instructions', value: 'Strictly Professional Dry Clean Only, Store in Acid-Free Box with Butter Paper' },
    ],
  },
];

// --- STORYBOOK META ---

const meta: Meta<any> = {
  title: 'Organisms/SpecificationsPanel',
  component: SpecificationsPanel,
  args: {
    ...THEME_ARGS,
    specs: SAREE_14_FLAT_SPECS,
    sku: 'VF2B56-01',
    showSilkMarkBadge: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof SpecificationsPanel>;

// --- INTERACTIVE RESPONSIVE DEVICE WRAPPER ---

function ResponsiveDevicePlayground({
  defaultCategory = 'saree',
  initialMode = 'cards',
}: {
  defaultCategory?: 'saree' | 'blouse' | 'kurti' | 'kids' | 'lehenga';
  initialMode?: 'cards' | 'tabs' | 'accordion';
}) {
  const [activeFactor, setActiveFactor] = useState<FormFactor>('desktop');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  const getCategoryData = () => {
    switch (selectedCategory) {
      case 'blouse':
        return {
          title: 'Brocade Padded Blouse Specs',
          subtitle: 'Numeric bust sizing 32-44, cup padding & alterable side margins',
          sku: 'VF189B-03',
          groups: STITCHED_BLOUSE_GROUPED_SPECS,
        };
      case 'kurti':
        return {
          title: 'Anarkali Suit Set Specifications',
          subtitle: 'Letter sizing XS-3XL, 3.8m ghera flare & cigarette pant',
          sku: 'VF2F4A-02',
          groups: KURTI_ANARKALI_GROUPED_SPECS,
        };
      case 'kids':
        return {
          title: 'Kids Pattu Pavadai Specifications',
          subtitle: 'Pure cotton asthar lining, korvai temple weave & age 4-5Y',
          sku: 'VF46D-01',
          groups: KIDS_WEAR_GROUPED_SPECS,
        };
      case 'lehenga':
        return {
          title: 'Bridal Lehenga Choli Specifications',
          subtitle: 'Double cancan, 4.2m flare, semi-stitched waist 28"-42"',
          sku: 'VF2F4F-01',
          groups: BRIDAL_LEHENGA_GROUPED_SPECS,
        };
      default:
        return {
          title: 'Banarasi Silk Saree Specifications',
          subtitle: '14 canonical attributes across craft, sizing & heirloom care',
          sku: 'VF2B56-01',
          groups: SAREE_GROUPED_SPECS,
        };
    }
  };

  const current = getCategoryData();

  const isMobile = activeFactor === 'mobile';
  const isTablet = activeFactor === 'tablet';
  const isDesktop = activeFactor === 'desktop';
  const containerWidth = isMobile ? 390 : isTablet ? 768 : 1100;

  return (
    <YStack gap={16} padding={16} alignItems="center" width="100%">
      {/* Top Interactive Controls Toolbar */}
      <YStack
        width={Math.min(containerWidth, 1100)}
        maxWidth="100%"
        backgroundColor="#0F172A"
        borderRadius={14}
        padding={12}
        gap={12}
      >
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <XStack alignItems="center" gap={8}>
            <LuSparkles size={16} color="#E2E8F0" />
            <Text fontSize={13} fontWeight="800" color="#F8FAFC" letterSpacing={0.5}>
              SPECIFICATIONS & CRAFT WORKBENCH
            </Text>
          </XStack>

          {/* Form Factor Switcher */}
          <XStack backgroundColor="#1E293B" borderRadius={10} padding={3} gap={4}>
            <Pressable
              onPress={() => setActiveFactor('mobile')}
              style={[
                styles.deviceButton,
                isMobile && styles.deviceButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuSmartphone size={13} color={isMobile ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isMobile ? '800' : '600'} color={isMobile ? '#FFFFFF' : '#94A3B8'}>
                  Mobile (390px)
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setActiveFactor('tablet')}
              style={[
                styles.deviceButton,
                isTablet && styles.deviceButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuTablet size={13} color={isTablet ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isTablet ? '800' : '600'} color={isTablet ? '#FFFFFF' : '#94A3B8'}>
                  Tablet (768px)
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setActiveFactor('desktop')}
              style={[
                styles.deviceButton,
                isDesktop && styles.deviceButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuMonitor size={13} color={isDesktop ? '#FFFFFF' : '#94A3B8'} />
                <Text fontSize={11} fontWeight={isDesktop ? '800' : '600'} color={isDesktop ? '#FFFFFF' : '#94A3B8'}>
                  Desktop (1100px)
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </XStack>

        {/* Category Switcher */}
        <XStack gap={6} flexWrap="wrap" alignItems="center">
          <Text fontSize={11} color="#94A3B8" fontWeight="600" marginRight={4}>
            Apparel Preset:
          </Text>
          {[
            { id: 'saree', label: '1. Saree (14 Attributes / Free Size)' },
            { id: 'blouse', label: '2. Stitched Blouse (Numeric 32-44)' },
            { id: 'kurti', label: '3. Anarkali Suit (Letter XS-3XL)' },
            { id: 'kids', label: '4. Kids Ethnic (Age 4-5Y)' },
            { id: 'lehenga', label: '5. Bridal Lehenga (Semi-Stitched)' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id as any)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
              >
                <Text
                  fontSize={11}
                  fontWeight={isSelected ? '800' : '600'}
                  color={isSelected ? '#FFFFFF' : '#94A3B8'}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* Simulated Device Viewport Canvas */}
      <FormFactorContext.Provider
        value={{
          factor: activeFactor,
          isMobile,
          isTablet,
          isDesktop,
          containerWidth,
        }}
      >
        <View
          style={[
            styles.viewportCanvas,
            {
              width: containerWidth,
              maxWidth: '100%',
              borderRadius: isMobile ? 24 : isTablet ? 16 : 8,
              borderColor: isMobile ? '#334155' : isTablet ? '#CBD5E1' : 'transparent',
              borderWidth: isMobile ? 3 : isTablet ? 1.5 : 0,
            },
          ]}
        >
          <SpecificationsPanel
            title={current.title}
            subtitle={current.subtitle}
            sku={current.sku}
            groupedSpecs={current.groups}
            defaultViewMode={initialMode}
            showSilkMarkBadge={true}
          />
        </View>
      </FormFactorContext.Provider>
    </YStack>
  );
}

// --- STORIES DEFINITIONS ---

/**
 * 1. Default: Banarasi Silk Saree with All 14 Canonical Attributes
 * Demonstrates the 14 attributes structured into 3 canonical groups:
 * - Craft & Handloom Heritage (7 attributes)
 * - Garment Dimensions & Tailoring (5 attributes)
 * - Occasions & Fabric Care (2 attributes)
 */
export const Saree_14_Attributes_Grouped: Story = {
  render: () => (
    <SpecificationsPanel
      title="Specifications & Craft Details"
      subtitle="Handloom provenance, tailored dimensions, and artisanal attributes"
      sku="VF2B56-01"
      groupedSpecs={SAREE_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 2. Automatic Grouping from Flat 14 Rows
 * Passes the unorganized 14 flat specs from Curation Workbench.
 * SpecificationsPanel automatically partitions them into the 3 groups.
 */
export const AutoPartitioning_From_Flat_14_Specs: Story = {
  render: () => (
    <SpecificationsPanel
      title="Auto-Partitioned From Flat Specs"
      subtitle="Raw flat specs from catalog automatically organized into 3 canonical sections"
      sku="VF2B56-01"
      specs={SAREE_14_FLAT_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 3. Segmented Tab Mode
 * Demonstrates the tabbed view where shoppers can toggle between:
 * - All (14)
 * - Craft & Fabric (7)
 * - Garment Dimensions (5)
 * - Occasions & Care (2)
 */
export const Segmented_Tab_View: Story = {
  render: () => (
    <SpecificationsPanel
      title="Segmented Category Tabs"
      subtitle="Focus on one category at a time with clean segmented navigation"
      sku="VF2B56-01"
      groupedSpecs={SAREE_GROUPED_SPECS}
      defaultViewMode="tabs"
    />
  ),
};

/**
 * 4. Collapsible Accordion Mode
 * Ideal for mobile screens, allowing shoppers to expand and collapse each category card.
 */
export const Collapsible_Accordion_View: Story = {
  render: () => (
    <SpecificationsPanel
      title="Accordion Collapsible View"
      subtitle="Compact expandable sections ideal for streamlined mobile shopping"
      sku="VF2B56-01"
      groupedSpecs={SAREE_GROUPED_SPECS}
      defaultViewMode="accordion"
    />
  ),
};

/**
 * 5. Stitched Blouse Specs (Numeric Sizes 32 - 44)
 * Highlights bust measurements, padded cups, neck styles, and alteration seam allowances.
 */
export const Stitched_Blouse_Numeric_Sizing: Story = {
  render: () => (
    <SpecificationsPanel
      title="Brocade Padded Blouse Specifications"
      subtitle="Numeric bust sizing 32-44, molded cup padding & 2-inch alterable side margins"
      sku="VF189B-03"
      groupedSpecs={STITCHED_BLOUSE_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 6. Anarkali Suit Set Specs (Letter Sizes XS - 3XL)
 * Displays kurti floor length, 3.8m full circular flare, cigarette pants, and organza dupatta.
 */
export const Anarkali_Suit_Letter_Sizing: Story = {
  render: () => (
    <SpecificationsPanel
      title="Anarkali Suit Set Specifications"
      subtitle="Letter sizing XS-3XL, 3.8m circular flare & semi-elasticated cigarette pant"
      sku="VF2F4A-02"
      groupedSpecs={KURTI_ANARKALI_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 7. Kids Ethnic Wear Specs (Age & Number Size 16 - 36 / 6M - 16Y)
 * Features hypoallergenic pure cotton lining, peplum top, elastic waistband, and temple borders.
 */
export const Kids_Pattu_Pavadai_Specs: Story = {
  render: () => (
    <SpecificationsPanel
      title="Kids Girls Pattu Pavadai Specifications"
      subtitle="Hypoallergenic cotton lining, korvai temple weave & age 4-5Y size 24"
      sku="VF46D-01"
      groupedSpecs={KIDS_WEAR_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 8. Bridal Lehenga Choli Specs (Semi-Stitched / Free Waist 28"-42")
 * Showcases double micro-cancan, heavy canvas patta, 4.2m dramatic flare, and 3.2kg trousseau.
 */
export const Bridal_Lehenga_Choli_Specs: Story = {
  render: () => (
    <SpecificationsPanel
      title="Bridal Lehenga Choli Specifications"
      subtitle="Double cancan, heavy canvas patta, 4.2m dramatic flare & semi-stitched waist 28-42"
      sku="VF2F4F-01"
      groupedSpecs={BRIDAL_LEHENGA_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

/**
 * 9. Interactive Multi-Device Playground
 * Allows live switching between Mobile (390px), Tablet (768px), and Desktop (1100px),
 * and dynamic toggling between all 5 apparel categories.
 */
export const Interactive_MultiDevice_Playground: Story = {
  render: () => <ResponsiveDevicePlayground defaultCategory="saree" initialMode="cards" />,
};

/**
 * 10. Mobile Viewport Simulation (390px iPhone Frame)
 */
export const Mobile_Viewport_390px: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  render: () => (
    <SpecificationsPanel
      title="Specifications & Craft Details"
      sku="VF2B56-01"
      groupedSpecs={SAREE_GROUPED_SPECS}
      defaultViewMode="accordion"
    />
  ),
};

/**
 * 11. Tablet Viewport Simulation (768px iPad Frame)
 */
export const Tablet_Viewport_768px: Story = {
  parameters: {
    formFactorShell: { defaultFactor: 'tablet' },
  },
  render: () => (
    <SpecificationsPanel
      title="Specifications & Craft Details"
      sku="VF2B56-01"
      groupedSpecs={SAREE_GROUPED_SPECS}
      defaultViewMode="cards"
    />
  ),
};

const styles = StyleSheet.create({
  deviceButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deviceButtonActive: {
    backgroundColor: '#0F766E',
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  categoryChipActive: {
    backgroundColor: '#D97706',
  },
  viewportCanvas: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    overflow: 'hidden',
  },
});
