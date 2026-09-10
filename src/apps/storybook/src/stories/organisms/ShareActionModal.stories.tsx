import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { ShareActionModal } from '../../components/organisms/ShareActionModal';
import { PostPlannerSharingQueue } from '../../components/organisms/PostPlannerSharingQueue';
import { PlannedProductInfo, TargetChannelOption, ChannelSharingQueueItem } from '../../components/molecules/post-planner.types';
import { DEFAULT_CHANNELS, DEFAULT_PRODUCTS } from '../../components/pages/AdminPostPlannerPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const MOCK_CHANNEL: TargetChannelOption = DEFAULT_CHANNELS[2]; // @saree_dump

const MOCK_PRODUCT: PlannedProductInfo = DEFAULT_PRODUCTS[0];

const MOCK_QUEUE_ITEMS: ChannelSharingQueueItem[] = [
  {
    ...DEFAULT_PRODUCTS[0],
    status: 'scheduled',
    scheduledTimeLabel: 'Tomorrow 11 AM',
  },
  {
    ...DEFAULT_PRODUCTS[1],
    status: 'assigned',
  },
  {
    ...DEFAULT_PRODUCTS[3],
    status: 'shared',
    scheduledTimeLabel: 'Yesterday',
  },
];

function ModalStoryWrapper(props: any) {
  const [open, setOpen] = useState(props.visible ?? true);
  const [selectedProduct, setSelectedProduct] = useState<PlannedProductInfo>(props.product || MOCK_PRODUCT);
  const [activeChannel, setActiveChannel] = useState<TargetChannelOption>(props.channel || MOCK_CHANNEL);

  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <PostPlannerSharingQueue
        channels={DEFAULT_CHANNELS}
        activeChannelId={activeChannel.id}
        onSelectChannel={(chId) => {
          const ch = DEFAULT_CHANNELS.find((c) => c.id === chId);
          if (ch) setActiveChannel(ch);
        }}
        channelItems={MOCK_QUEUE_ITEMS}
        onSelectItem={(item) => {
          setSelectedProduct(item);
          setOpen(true);
        }}
      />
      <ShareActionModal
        {...props}
        product={selectedProduct}
        channel={activeChannel}
        visible={open}
        onDismiss={() => setOpen(false)}
        onSharedNow={() => setOpen(false)}
        onScheduled={() => setOpen(false)}
        onExcludeChannel={() => setOpen(false)}
      />
    </View>
  );
}

const meta: Meta<any> = {
  title: 'Organisms/ShareActionModal',
  component: ShareActionModal,
  decorators: [withFormFactor('mobile', 'Share Action & Scheduling Modal (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    visible: true,
    product: MOCK_PRODUCT,
    channel: MOCK_CHANNEL,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultPrompt: Story = {
  name: '1. Action Prompt (Shared Now, Schedule, Exclude)',
  args: {
    visible: true,
  },
  render: (args) => <ModalStoryWrapper {...args} />,
};

export const InteractiveModal: Story = {
  name: '2. Interactive (Tap Queue Garment to Open Modal)',
  render: (args) => <ModalStoryWrapper {...args} />,
};
