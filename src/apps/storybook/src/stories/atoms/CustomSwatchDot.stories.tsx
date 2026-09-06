import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
} from '../../components/atoms/SwatchDot/CustomSwatchDot';

const meta: Meta<any> = {
  title: 'Atoms/CustomSwatchDot',
  component: CustomSwatchDot,
  args: {
    ...THEME_ARGS,
    template: 'contrast-border',
    primaryColor: '#1565C0',
    secondaryColor: '#E91E63',
    size: 40,
    shape: 'circle',
    selected: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    template: {
      control: 'select',
      options: ['solid', 'contrast-border', 'dual-tone', 'half-and-half', 'multicolor'],
    },
    shape: {
      control: 'select',
      options: ['circle', 'square'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CustomSwatchDot>;

export const ContrastBorder: Story = {
  args: {
    template: 'contrast-border',
    primaryColor: '#1565C0', // Navy Blue body (80%)
    secondaryColor: '#E91E63', // Rani Pink border (20%)
    size: 44,
  },
};

export const DualToneDhupChhaon: Story = {
  args: {
    template: 'dual-tone',
    primaryColor: '#6A1B9A', // Deep Purple warp
    secondaryColor: '#2E7D32', // Emerald Green weft
    size: 44,
  },
};

export const HalfAndHalf: Story = {
  args: {
    template: 'half-and-half',
    primaryColor: '#FBC02D', // Mustard Yellow (50%)
    secondaryColor: '#1B5E20', // Bottle Green (50%)
    size: 44,
  },
};

export const Multicolor: Story = {
  args: {
    template: 'multicolor',
    primaryColor: '#C62828', // Red
    secondaryColor: '#FBC02D', // Yellow
    tertiaryColor: '#2E7D32', // Green
    quaternaryColor: '#1565C0', // Blue
    size: 44,
  },
};

export const Solid: Story = {
  args: {
    template: 'solid',
    primaryColor: '#D4AF37', // Pure Gold
    size: 44,
  },
};

export const AllTemplatesShowcase = (args: any) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('contrast');

  const swatches: {
    id: string;
    title: string;
    description: string;
    template: SwatchTemplateType;
    p1: string;
    p2?: string;
    p3?: string;
    p4?: string;
  }[] = [
    {
      id: 'contrast',
      title: '1. Contrast Border Swatch',
      description: 'Top 80% body color + bottom 20% solid strip of border/zari color.',
      template: 'contrast-border',
      p1: '#1565C0',
      p2: '#E91E63',
    },
    {
      id: 'dualtone',
      title: '2. Dual-Tone (Dhup-Chhaon) Swatch',
      description: 'Smooth diagonal gradient mimicking iridescent warp & weft silk threads.',
      template: 'dual-tone',
      p1: '#6A1B9A',
      p2: '#2E7D32',
    },
    {
      id: 'halfhalf',
      title: '3. Half-and-Half Swatch',
      description: 'Strict 50/50 split down the middle separating pleats from the pallu/body.',
      template: 'half-and-half',
      p1: '#FBC02D',
      p2: '#1B5E20',
    },
    {
      id: 'multi',
      title: '4. Multicolor Swatch',
      description: '4 equal quadrants for digital prints, bandhani, or patchwork sarees.',
      template: 'multicolor',
      p1: '#C62828',
      p2: '#FBC02D',
      p3: '#2E7D32',
      p4: '#1565C0',
    },
    {
      id: 'solid',
      title: '5. Pure Solid Swatch',
      description: 'Classic monochrome weave or single solid body fabric.',
      template: 'solid',
      p1: '#D4AF37',
    },
  ];

  return (
    <YStack gap={24} padding={20} maxWidth={640}>
      <YStack gap={4}>
        <Text fontSize={18} fontWeight="900" color="#222">
          Ethnic Saree Swatch Typology
        </Text>
        <Text fontSize={12} color="#666">
          Customized vector swatches representing authentic ethnic garment weave patterns.
        </Text>
      </YStack>

      <YStack gap={16}>
        {swatches.map((s) => (
          <XStack
            key={s.id}
            backgroundColor="#ffffff"
            padding={16}
            borderRadius={16}
            borderWidth={1}
            borderColor={selectedTemplate === s.id ? '#D4AF37' : '#e5e5e5'}
            alignItems="center"
            justifyContent="space-between"
            cursor="pointer"
            onPress={() => setSelectedTemplate(s.id)}
            hoverStyle={{ borderColor: '#D4AF37', scale: 1.01 }}
          >
            <YStack flex={1} gap={4} paddingRight={16}>
              <Text fontSize={14} fontWeight="800" color="#111">
                {s.title}
              </Text>
              <Text fontSize={12} color="#666" lineHeight={16}>
                {s.description}
              </Text>
            </YStack>

            <XStack gap={12} alignItems="center">
              {/* Circular Swatch */}
              <CustomSwatchDot
                template={s.template}
                primaryColor={s.p1}
                secondaryColor={s.p2}
                tertiaryColor={s.p3}
                quaternaryColor={s.p4}
                size={38}
                shape="circle"
                selected={selectedTemplate === s.id}
              />
              {/* Rounded Square Swatch */}
              <CustomSwatchDot
                template={s.template}
                primaryColor={s.p1}
                secondaryColor={s.p2}
                tertiaryColor={s.p3}
                quaternaryColor={s.p4}
                size={38}
                shape="square"
                selected={selectedTemplate === s.id}
              />
            </XStack>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
};
