import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles, LuImage, LuLayers, LuTag } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
} from '../../components/atoms/SwatchDot/CustomSwatchDot';

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Organisms/ReviewerColorCuration',
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

const AUTO_EXTRACTED_COLORS = [
  { hex: '#1565C0', name: 'Blue', percentage: 65.4 },
  { hex: '#E91E63', name: 'Pink', percentage: 24.8 },
  { hex: '#D4AF37', name: 'Gold', percentage: 9.8 },
];

const MOCK_PHOTOS = [
  { id: 'p1', title: 'Front Drape - Rani Pink Contrast Border' },
  { id: 'p2', title: 'Zari Border Close-up' },
  { id: 'p3', title: 'Pleat Texture and Fall' },
  { id: 'p4', title: 'Matching Blouse Piece' },
];

export const CurationPortalWireframe = (args: any) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SwatchTemplateType>('contrast-border');
  const [primaryColor, setPrimaryColor] = useState<string>('#1565C0');
  const [secondaryColor, setSecondaryColor] = useState<string>('#E91E63');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(['p1', 'p2', 'p3', 'p4']);
  const [showFullPalette, setShowFullPalette] = useState(false);

  const togglePhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const templates: { id: SwatchTemplateType; label: string; desc: string }[] = [
    { id: 'solid', label: 'Solid', desc: 'Single monochrome body fabric' },
    { id: 'contrast-border', label: 'Contrast Border', desc: '80% body + 20% border/zari strip' },
    { id: 'dual-tone', label: 'Dual-Tone (Dhup-Chhaon)', desc: 'Iridescent warp/weft diagonal gradient' },
    { id: 'half-and-half', label: 'Half & Half', desc: '50/50 pleat vs. body vertical divide' },
    { id: 'multicolor', label: 'Multicolor', desc: '4 equal quadrants for bandhani or print' },
  ];

  return (
    <ScrollView style={{ maxWidth: 840, padding: 24 }}>
      <YStack gap={24}>
        {/* Header */}
        <YStack gap={6}>
          <XStack alignItems="center" gap={10}>
            <LuLayers size={22} color="#D4AF37" />
            <Text fontSize={20} fontWeight="900" color="#222">
              Catalog Reviewer: Color Curation &amp; Image Grouping
            </Text>
          </XStack>
          <Text fontSize={13} color="#666" lineHeight={18}>
            Review automated K-Means dominant colors, assign a specialized ethnic swatch template, map colors to positions, and group corresponding product media.
          </Text>
        </YStack>

        {/* Step 1: Auto-Extracted Colors */}
        <YStack backgroundColor="#f7f7f8" borderRadius={16} padding={16} gap={10} borderWidth={1} borderColor="#e5e5e7">
          <XStack alignItems="center" gap={8}>
            <LuSparkles size={16} color="#E91E63" />
            <Text fontSize={13} fontWeight="800" color="#333">
              1. AUTO-EXTRACTED COLORS (K-MEANS K=3 MICROSERVICE)
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap={12}>
            {AUTO_EXTRACTED_COLORS.map((c) => (
              <XStack
                key={c.hex}
                backgroundColor="#ffffff"
                borderRadius={12}
                paddingHorizontal={12}
                paddingVertical={8}
                alignItems="center"
                gap={10}
                borderWidth={1}
                borderColor="#ddd"
              >
                <XStack width={22} height={22} borderRadius={9999} backgroundColor={c.hex} />
                <YStack>
                  <Text fontSize={12} fontWeight="800" color="#222">
                    {c.name} ({c.percentage}%)
                  </Text>
                  <Text fontSize={10} color="#888">
                    {c.hex}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </XStack>
        </YStack>

        {/* Step 2: Choose Swatch Template */}
        <YStack gap={10}>
          <Text fontSize={13} fontWeight="800" color="#333">
            2. CHOOSE SWATCH TEMPLATE
          </Text>
          <XStack flexWrap="wrap" gap={10}>
            {templates.map((t) => {
              const isSelected = selectedTemplate === t.id;
              return (
                <XStack
                  key={t.id}
                  flexBasis="48%"
                  flexGrow={1}
                  padding={14}
                  borderRadius={12}
                  borderWidth={isSelected ? 2 : 1}
                  borderColor={isSelected ? '#D4AF37' : '#e0e0e0'}
                  backgroundColor={isSelected ? '#fffdf7' : '#ffffff'}
                  cursor="pointer"
                  onPress={() => setSelectedTemplate(t.id)}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <YStack gap={2} flex={1} paddingRight={10}>
                    <Text fontSize={13} fontWeight={isSelected ? '800' : '600'} color="#222">
                      {t.label}
                    </Text>
                    <Text fontSize={11} color="#666">
                      {t.desc}
                    </Text>
                  </YStack>
                  <CustomSwatchDot
                    template={t.id}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    size={32}
                  />
                </XStack>
              );
            })}
          </XStack>
        </YStack>

        {/* Step 3: Map Colors to Positions */}
        <YStack gap={12}>
          <Text fontSize={13} fontWeight="800" color="#333">
            3. MAP COLORS TO SWATCH POSITIONS
          </Text>

          {/* Slot A */}
          <YStack backgroundColor="#ffffff" borderWidth={1} borderColor="#e0e0e0" borderRadius={14} padding={16} gap={10}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={13} fontWeight="800" color="#222">
                Slot A: Primary Body Color (80%)
              </Text>
              <XStack width={20} height={20} borderRadius={9999} backgroundColor={primaryColor} />
            </XStack>

            <Text fontSize={11} color="#666">
              Priority Auto-Extracted Suggestions:
            </Text>
            <XStack gap={8}>
              {AUTO_EXTRACTED_COLORS.map((c) => (
                <XStack
                  key={`slotA-${c.hex}`}
                  paddingHorizontal={10}
                  paddingVertical={6}
                  borderRadius={8}
                  borderWidth={1}
                  borderColor={primaryColor === c.hex ? '#1565C0' : '#ddd'}
                  backgroundColor={primaryColor === c.hex ? '#e3f2fd' : '#f9f9f9'}
                  alignItems="center"
                  gap={6}
                  cursor="pointer"
                  onPress={() => setPrimaryColor(c.hex)}
                >
                  <XStack width={14} height={14} borderRadius={9999} backgroundColor={c.hex} />
                  <Text fontSize={11} fontWeight="700" color="#333">
                    {c.name}
                  </Text>
                </XStack>
              ))}
            </XStack>
          </YStack>

          {/* Slot B */}
          {selectedTemplate !== 'solid' ? (
            <YStack backgroundColor="#ffffff" borderWidth={1} borderColor="#e0e0e0" borderRadius={14} padding={16} gap={10}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={13} fontWeight="800" color="#222">
                  Slot B: Border Contrast Color (20%)
                </Text>
                <XStack width={20} height={20} borderRadius={9999} backgroundColor={secondaryColor} />
              </XStack>

              <Text fontSize={11} color="#666">
                Priority Auto-Extracted Suggestions:
              </Text>
              <XStack gap={8}>
                {AUTO_EXTRACTED_COLORS.map((c) => (
                  <XStack
                    key={`slotB-${c.hex}`}
                    paddingHorizontal={10}
                    paddingVertical={6}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={secondaryColor === c.hex ? '#E91E63' : '#ddd'}
                    backgroundColor={secondaryColor === c.hex ? '#fce4ec' : '#f9f9f9'}
                    alignItems="center"
                    gap={6}
                    cursor="pointer"
                    onPress={() => setSecondaryColor(c.hex)}
                  >
                    <XStack width={14} height={14} borderRadius={9999} backgroundColor={c.hex} />
                    <Text fontSize={11} fontWeight="700" color="#333">
                      {c.name}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </YStack>
          ) : null}

          {/* Full Palette Toggle */}
          <XStack
            cursor="pointer"
            padding={8}
            onPress={() => setShowFullPalette(!showFullPalette)}
          >
            <Text fontSize={12} fontWeight="800" color="#1565C0">
              {showFullPalette ? 'Hide Full Palette' : 'Show Standard 21-Color Palette'}
            </Text>
          </XStack>

          {showFullPalette ? (
            <XStack flexWrap="wrap" gap={8} backgroundColor="#f9f9f9" padding={12} borderRadius={12}>
              {Object.entries(STANDARD_PALETTE).map(([name, hex]) => (
                <XStack
                  key={name}
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={6}
                  backgroundColor="#ffffff"
                  borderWidth={1}
                  borderColor="#ddd"
                  alignItems="center"
                  gap={6}
                  cursor="pointer"
                  onPress={() => setSecondaryColor(hex)}
                >
                  <XStack width={12} height={12} borderRadius={9999} backgroundColor={hex} />
                  <Text fontSize={11} color="#333" fontWeight="600">
                    {name}
                  </Text>
                </XStack>
              ))}
            </XStack>
          ) : null}
        </YStack>

        {/* Step 4: Multi-Photo Grouping */}
        <YStack gap={10}>
          <XStack alignItems="center" gap={8}>
            <LuImage size={16} color="#333" />
            <Text fontSize={13} fontWeight="800" color="#333">
              4. GROUP PHOTOS TO THIS COLOR TAG
            </Text>
          </XStack>
          <YStack gap={8}>
            {MOCK_PHOTOS.map((photo) => {
              const isChecked = selectedPhotoIds.includes(photo.id);
              return (
                <XStack
                  key={photo.id}
                  backgroundColor="#ffffff"
                  borderWidth={1}
                  borderColor={isChecked ? '#D4AF37' : '#e0e0e0'}
                  borderRadius={10}
                  padding={12}
                  alignItems="center"
                  gap={12}
                  cursor="pointer"
                  onPress={() => togglePhoto(photo.id)}
                >
                  <XStack
                    width={18}
                    height={18}
                    borderRadius={4}
                    borderWidth={1.5}
                    borderColor={isChecked ? '#D4AF37' : '#999'}
                    backgroundColor={isChecked ? '#D4AF37' : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isChecked ? <LuCheck size={12} color="#ffffff" strokeWidth={3} /> : null}
                  </XStack>
                  <Text fontSize={13} color="#333" fontWeight={isChecked ? '700' : '500'}>
                    {photo.title}
                  </Text>
                </XStack>
              );
            })}
          </YStack>
        </YStack>

        {/* Step 5: Live Customer Output Preview */}
        <YStack backgroundColor="#f0f4f8" borderRadius={16} padding={18} gap={12} borderWidth={1} borderColor="#d0dbe5">
          <XStack alignItems="center" gap={8}>
            <LuTag size={16} color="#1565C0" />
            <Text fontSize={13} fontWeight="900" color="#1565C0">
              CUSTOMER STOREFRONT LIVE OUTPUT
            </Text>
          </XStack>

          <XStack alignItems="center" gap={16} backgroundColor="#ffffff" padding={14} borderRadius={12}>
            <CustomSwatchDot
              template={selectedTemplate}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              size={44}
              selected={true}
            />
            <YStack gap={2}>
              <Text fontSize={14} fontWeight="800" color="#111">
                Generated Swatch: {selectedTemplate.toUpperCase()}
              </Text>
              <Text fontSize={12} color="#666">
                Assigned Photos: {selectedPhotoIds.length} images grouped to this variant
              </Text>
              <Text fontSize={11} color="#00796B" fontWeight="700">
                Customer Filter Tags: [Blue, Pink, Contrast Border]
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
};
