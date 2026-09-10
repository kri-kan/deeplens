import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Pressable } from 'react-native';
import { YStack, Text } from 'tamagui';
import { LuRotateCcw, LuCheckCheck } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { PlannedProductInfo, TargetChannelOption, ChannelSharingQueueItem } from '../../../components/molecules/post-planner.types';
import { PostPlannerCurationGrid } from '../../../components/organisms/PostPlannerCurationGrid';
import { PostPlannerSharingQueue } from '../../../components/organisms/PostPlannerSharingQueue';
import { TargetEligibilitiesBottomSheet } from '../../../components/organisms/TargetEligibilitiesBottomSheet';
import { ShareActionModal } from '../../../components/organisms/ShareActionModal';

const CHANNELS: TargetChannelOption[] = [
  {
    id: 'ch-1',
    username: 'vayyari_fashions',
    channelType: 'focus',
    niche: 'Core Luxury Festive Wear',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    isSuggestedMatch: true,
  },
  {
    id: 'ch-2',
    username: 'dressbyvayyari',
    channelType: 'focus',
    niche: 'Kurtis, Anarkalis & Dresses',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    isSuggestedMatch: false,
  },
  {
    id: 'ch-3',
    username: 'saree_dump',
    channelType: 'dump',
    niche: 'Silk & Handloom Saree Curation',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    isSuggestedMatch: true,
  },
  {
    id: 'ch-4',
    username: 'fusion_edits_dump',
    channelType: 'dump',
    niche: 'Modern Western & Fusion Wear',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    isSuggestedMatch: false,
  },
];

const INITIAL_CURATION_ITEMS: PlannedProductInfo[] = [
  {
    id: 'sku-001',
    productCode: 'SAR-KAN-901',
    title: 'Kanjivaram Silk Saree',
    category: 'Saree',
    fabric: 'Mulberry Silk',
    price: 8499,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    assignedChannelIds: ['ch-1', 'ch-3'],
    planningStatus: 'in_progress',
  },
  {
    id: 'sku-002',
    productCode: 'SAR-BAN-402',
    title: 'Banarasi Zari Tissue Saree',
    category: 'Saree',
    fabric: 'Tissue Zari',
    price: 11200,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    assignedChannelIds: ['ch-3'],
    planningStatus: 'in_progress',
  },
  {
    id: 'sku-003',
    productCode: 'DRS-ANA-103',
    title: 'Floor Length Anarkali Gown',
    category: 'Dress',
    fabric: 'Georgette',
    price: 4599,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    assignedChannelIds: ['ch-2'],
    planningStatus: 'complete',
  },
  {
    id: 'sku-004',
    productCode: 'LEH-BRD-504',
    title: 'Crimson Velvet Bridal Lehanga',
    category: 'Lehanga',
    fabric: 'Raw Silk Velvet',
    price: 18500,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    assignedChannelIds: ['ch-1', 'ch-4'],
    planningStatus: 'in_progress',
  },
  {
    id: 'sku-005',
    productCode: 'SAR-PAT-305',
    title: 'Patola Ikat Silk Saree',
    category: 'Saree',
    fabric: 'Double Ikat Silk',
    price: 14500,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    assignedChannelIds: ['ch-3'],
    planningStatus: 'complete',
  },
  {
    id: 'sku-008',
    productCode: 'LEH-MIR-808',
    title: 'Mirror Work Georgette Lehanga',
    category: 'Lehanga',
    fabric: 'Faux Georgette',
    price: 12999,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    assignedChannelIds: [],
    planningStatus: 'in_progress',
  },
];

interface PostPlanningJourneyState {
  curationItems: PlannedProductInfo[];
  selectedItem: PlannedProductInfo;
  activeChannelId: string;
  channelStatuses: Record<string, { status: 'assigned' | 'scheduled' | 'shared' | 'excluded'; timeLabel?: string }>;
}

const INITIAL_JOURNEY_STATE: PostPlanningJourneyState = {
  curationItems: INITIAL_CURATION_ITEMS,
  selectedItem: INITIAL_CURATION_ITEMS[0],
  activeChannelId: 'ch-3',
  channelStatuses: {
    'sku-001_ch-1': { status: 'assigned' },
    'sku-001_ch-3': { status: 'assigned' },
    'sku-002_ch-3': { status: 'assigned' },
    'sku-005_ch-3': { status: 'shared', timeLabel: 'Yesterday' },
  },
};

function JourneyCompletionChapter({ onRestart }: { onRestart: () => void }) {
  const { tokens } = useTheme();

  return (
    <YStack
      flex={1}
      minHeight={580}
      backgroundColor={tokens.background}
      alignItems="center"
      justifyContent="center"
      padding={24}
      gap={20}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: tokens.accentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LuCheckCheck size={40} color={tokens.accent} />
      </View>

      <YStack alignItems="center" gap={8} maxWidth={380}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          Mobile Post Planning Verified
        </Text>
        <Text fontSize={22} fontWeight="800" color={tokens.text} textAlign="center">
          Full Instagram Flow Validated
        </Text>
        <Text fontSize={13} color={tokens.textSecondary} textAlign="center" lineHeight={20}>
          The operator successfully browsed the 3-column starred catalog grid, assigned Target Channel Eligibilities via circular avatars, clicked Complete to route garment to publishing queues, navigated the @saree_dump publishing queue, and scheduled the post for Tomorrow 11:00 AM.
        </Text>
      </YStack>

      <Pressable
        onPress={onRestart}
        style={{
          backgroundColor: tokens.accent,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <LuRotateCcw size={16} color={tokens.accentForeground} />
        <Text fontSize={13} fontWeight="700" color={tokens.accentForeground}>
          Replay Mobile Post Planning Workflow
        </Text>
      </Pressable>
    </YStack>
  );
}

const postPlanningWorkflowJourney: JourneyDefinition<PostPlanningJourneyState> = {
  id: 'post-planning-workflow',
  title: 'Mobile Instagram Post Planning & Channel Distribution',
  tag: '📸 Mobile Admin Book · Instagram Curation & Sharing',
  description:
    'Simulates an operator qualifying starred catalog items in a 3-column media grid, assigning Target Channel Eligibilities to Focus and Dump channels via circular avatars, and executing frictionless scheduling per channel queue.',
  initialState: INITIAL_JOURNEY_STATE,
  steps: [
    {
      id: 'step-curation',
      title: '1. Starred Catalog Grid',
      subtitle: 'Browse & Filter Products',
      badge: 'Curation',
      simulatedAction: {
        label: 'Select SAR-KAN-901 Saree',
        description:
          'Operator navigates the 3-column starred catalog grid and taps Kanjivaram Silk Saree to allocate to Instagram channels.',
        durationMs: 3800,
      },
      render: ({ state, updateState, nextStep }) => (
        <YStack flex={1} maxWidth={440} alignSelf="center" width="100%">
          <PostPlannerCurationGrid
            items={state.curationItems}
            onSelectItem={(item) => {
              updateState({ selectedItem: item });
              nextStep();
            }}
          />
        </YStack>
      ),
    },
    {
      id: 'step-affinity-sheet',
      title: '2. Target Channel Eligibilities',
      subtitle: 'Assign Channel Avatars & Complete',
      badge: 'Affinity',
      simulatedAction: {
        label: 'Assign Channels & Click "Complete"',
        description:
          'Bottom sheet opens with AI Suggest Title/Keywords, campaign inputs, and circular avatars for @vayyari_fashions and @saree_dump. Operator selects channels and clicks "Complete" to route item into sharing queue.',
        durationMs: 4200,
      },
      render: ({ state, updateState, nextStep }) => (
        <YStack flex={1} maxWidth={440} alignSelf="center" width="100%" position="relative" overflow="hidden">
          <PostPlannerCurationGrid
            items={state.curationItems}
            onSelectItem={() => {}}
          />
          <TargetEligibilitiesBottomSheet
            visible={true}
            product={state.selectedItem}
            channels={CHANNELS}
            assignedChannelIds={state.selectedItem.assignedChannelIds || []}
            onSaveAffinity={(selectedIds, isComplete) => {
              updateState((prev) => ({
                curationItems: prev.curationItems.map((it) =>
                  it.id === prev.selectedItem.id
                    ? { ...it, assignedChannelIds: selectedIds, planningStatus: isComplete ? 'complete' : 'in_progress' }
                    : it
                ),
              }));
              nextStep();
            }}
            onDismiss={() => nextStep()}
          />
        </YStack>
      ),
    },
    {
      id: 'step-channel-queue',
      title: '3. Channel Queue Grid',
      subtitle: 'Review Publishing Queue',
      badge: 'Queue',
      simulatedAction: {
        label: 'Select @saree_dump Queue',
        description:
          'Operator switches to Post Sharing view, selects @saree_dump story ring, and selects SAR-KAN-901 in the 3-column media queue.',
        durationMs: 4000,
      },
      render: ({ state, updateState, nextStep }) => {
        const sharingItems: ChannelSharingQueueItem[] = state.curationItems
          .filter((item) => item.assignedChannelIds?.includes(state.activeChannelId))
          .map((item) => {
            const key = `${item.id}_${state.activeChannelId}`;
            const statusInfo = state.channelStatuses[key] || { status: 'assigned' };
            return {
              ...item,
              status: statusInfo.status,
              scheduledTimeLabel: statusInfo.timeLabel,
            };
          });

        return (
          <YStack flex={1} maxWidth={440} alignSelf="center" width="100%" position="relative" overflow="hidden">
            <PostPlannerSharingQueue
              channels={CHANNELS}
              activeChannelId={state.activeChannelId}
              onSelectChannel={(chId) => updateState({ activeChannelId: chId })}
              channelItems={sharingItems}
              onSelectItem={(item) => {
                const full = state.curationItems.find((c) => c.id === item.id) || state.curationItems[0];
                updateState({ selectedItem: full });
                nextStep();
              }}
            />
          </YStack>
        );
      },
    },
    {
      id: 'step-instant-schedule',
      title: '4. Instant Schedule Modal',
      subtitle: 'Quick Time Preset Capture',
      badge: 'Schedule',
      simulatedAction: {
        label: 'Choose Preset: Tomorrow 11:00 AM',
        description:
          'Operator taps "Tomorrow 11:00 AM" preset. Item is stamped as scheduled and badge updates in queue.',
        durationMs: 4500,
      },
      render: ({ state, updateState, nextStep }) => {
        const activeChannel = CHANNELS.find((c) => c.id === state.activeChannelId) || CHANNELS[2];
        const sharingItems: ChannelSharingQueueItem[] = state.curationItems
          .filter((item) => item.assignedChannelIds?.includes(state.activeChannelId))
          .map((item) => {
            const key = `${item.id}_${state.activeChannelId}`;
            const statusInfo = state.channelStatuses[key] || { status: 'assigned' };
            return {
              ...item,
              status: statusInfo.status,
              scheduledTimeLabel: statusInfo.timeLabel,
            };
          });

        return (
          <YStack flex={1} maxWidth={440} alignSelf="center" width="100%" position="relative" overflow="hidden">
            <PostPlannerSharingQueue
              channels={CHANNELS}
              activeChannelId={state.activeChannelId}
              onSelectChannel={() => {}}
              channelItems={sharingItems}
              onSelectItem={() => {}}
            />
            <ShareActionModal
              visible={true}
              product={state.selectedItem}
              channel={activeChannel}
              onSharedNow={() => {
                const key = `${state.selectedItem.id}_${activeChannel.id}`;
                updateState((prev) => ({
                  channelStatuses: {
                    ...prev.channelStatuses,
                    [key]: { status: 'shared', timeLabel: 'Just Now' },
                  },
                }));
                nextStep();
              }}
              onScheduled={(date, presetLabel) => {
                const key = `${state.selectedItem.id}_${activeChannel.id}`;
                updateState((prev) => ({
                  channelStatuses: {
                    ...prev.channelStatuses,
                    [key]: { status: 'scheduled', timeLabel: presetLabel },
                  },
                }));
                nextStep();
              }}
              onExcludeChannel={() => {
                const key = `${state.selectedItem.id}_${activeChannel.id}`;
                updateState((prev) => ({
                  channelStatuses: {
                    ...prev.channelStatuses,
                    [key]: { status: 'excluded' },
                  },
                }));
                nextStep();
              }}
              onDismiss={() => nextStep()}
            />
          </YStack>
        );
      },
    },
    {
      id: 'step-complete',
      title: '5. Workflow Verified',
      subtitle: 'Mobile End-to-End Complete',
      badge: 'Complete',
      simulatedAction: {
        label: 'Mobile Workflow Verified',
        description: 'Mobile Instagram Post Planning lifecycle validated across all views and actions.',
        durationMs: 3500,
      },
      render: ({ goToStep }) => <JourneyCompletionChapter onRestart={() => goToStep(0)} />,
    },
  ],
};

const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Admin/Post Planning Workflow',
  component: JourneyPlayer,
  args: {
    ...THEME_ARGS,
    initialAutoPlay: false,
    initialFormFactor: 'mobile',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialAutoPlay: {
      control: 'boolean',
      description: 'Start simulation automatically on story load',
    },
    initialFormFactor: {
      control: 'select',
      options: ['desktop', 'tablet', 'mobile'],
      description: 'Default viewport size for the journey',
    },
  },
};

export default meta;
type Story = StoryObj<typeof JourneyPlayer>;

export const InteractivePostPlanningJourney: Story = {
  render: (args: any) => (
    <JourneyPlayer
      journey={postPlanningWorkflowJourney}
      initialFormFactor={args.initialFormFactor || 'mobile'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

export const AutoPlaySimulation: Story = {
  render: () => (
    <JourneyPlayer
      journey={postPlanningWorkflowJourney}
      initialFormFactor="mobile"
      initialAutoPlay={true}
    />
  ),
};
