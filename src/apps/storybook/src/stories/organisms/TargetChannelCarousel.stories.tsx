import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text } from 'react-native';
import { TargetChannelCarousel } from '../../components/organisms/TargetChannelCarousel';
import { TargetChannelOption } from '../../components/molecules/post-planner.types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const MOCK_CHANNELS: TargetChannelOption[] = [
  {
    id: 'ch-1',
    username: 'vayyari_fashions',
    channelType: 'focus',
    niche: 'Core Luxury Festive Wear',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    id: 'ch-2',
    username: 'dressbyvayyari',
    channelType: 'focus',
    niche: 'Kurtis, Anarkalis & Dresses',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
  },
  {
    id: 'ch-3',
    username: 'saree_dump',
    channelType: 'dump',
    niche: 'Silk & Handloom Saree Curation',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
  },
  {
    id: 'ch-4',
    username: 'fusion_edits_dump',
    channelType: 'dump',
    niche: 'Modern Western & Fusion Wear',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
];

function CarouselPreview(props: any) {
  const [activeId, setActiveId] = useState(props.activeChannelId || 'ch-1');
  const activeChannel = props.channels.find((c: any) => c.id === activeId) || props.channels[0];
  const isFocus = activeChannel?.channelType === 'focus';

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
      <TargetChannelCarousel
        {...props}
        activeChannelId={activeId}
        onSelectChannel={(id) => {
          setActiveId(id);
          props.onSelectChannel?.(id);
        }}
      />
      <View style={{ padding: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.08)',
            padding: 16,
            gap: 8,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1817' }}>
              @{activeChannel?.username}
            </Text>
            <View
              style={{
                backgroundColor: isFocus ? '#EBF8FF' : '#FAF5FF',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: isFocus ? '#2B6CB0' : '#6B46C1' }}>
                {isFocus ? '🎯 Focus Channel' : '📦 Dump Channel'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            {activeChannel?.niche}
          </Text>
          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 4 }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
            ✓ Ready to receive starred catalog item allocations
          </Text>
        </View>
      </View>
    </View>
  );
}

const meta: Meta<any> = {
  title: 'Organisms/TargetChannelCarousel',
  component: TargetChannelCarousel,
  decorators: [withFormFactor('mobile', 'Target Channel Selection Carousel (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    channels: MOCK_CHANNELS,
    activeChannelId: 'ch-1',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const FocusActive: Story = {
  name: '1. Focus Channel Active (@vayyari_fashions)',
  render: (args) => <CarouselPreview {...args} activeChannelId="ch-1" />,
};

export const DumpActive: Story = {
  name: '2. Dump Channel Active (@saree_dump)',
  render: (args) => <CarouselPreview {...args} activeChannelId="ch-3" />,
};

export const Interactive: Story = {
  name: '3. Interactive (Tap Avatar to Switch Active Channel)',
  render: (args) => <CarouselPreview {...args} />,
};
