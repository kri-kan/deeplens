import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminCollabQueuePage,
} from '../../components/pages/AdminCollabQueuePage';
import {
  DEFAULT_COLLAB_ACCOUNTS,
  DEFAULT_COLLAB_POSTS,
} from '../../components/pages/AdminCollabPlannerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const MOCK_QUEUE_ITEMS = [
  {
    ...DEFAULT_COLLAB_POSTS[0],
    id: 'queue-1',
    curationStatus: 'queued' as const,
    targetCollabAccounts: ['dressbyvayyari', 'theblouseedition', 'vayyari_littles'],
  },
  {
    ...DEFAULT_COLLAB_POSTS[1],
    id: 'queue-2',
    ownerUsername: 'theblouseedition',
    caption: 'Handcrafted raw silk festive blouse with zardozi collar and gold piping detail.',
    curationStatus: 'queued' as const,
    targetCollabAccounts: ['vayyari_fashions', 'vayyaristudio'],
  },
  {
    ...DEFAULT_COLLAB_POSTS[2],
    id: 'queue-3',
    ownerUsername: 'editionsbyvayyari',
    caption: 'Heritage gold zari organza drape with hand-embossed borders for festive launch.',
    curationStatus: 'queued' as const,
    targetCollabAccounts: ['vayyari_fashions', 'vayyari_prive', 'everydayvayyari', 'eclipsevayyari'],
  },
];

const meta: Meta<any> = {
  title: 'Pages/Admin/Collab Queue',
  component: AdminCollabQueuePage,
  decorators: [withFormFactor('mobile', 'Collab Queue Management (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    accounts: DEFAULT_COLLAB_ACCOUNTS,
    queueItems: MOCK_QUEUE_ITEMS,
    loading: false,
    refreshing: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * Story 1: Active Queue with Multiple Posts
 * Displays queued posts with thumbnails, target collaborator chips, unqueue actions,
 * and AVD automation status banner.
 */
export const ActiveQueueMultiplePosts: Story = {
  name: '1. Active Queue: 3 Posts Ready for Automation',
  args: {
    queueItems: MOCK_QUEUE_ITEMS,
  },
};

/**
 * Story 2: Single Post with Maximum 5 Target Collaborators
 * Showcases post configured with 5 target accounts (Instagram limit).
 */
export const SinglePostMaxFiveTargets: Story = {
  name: '2. Single Post: Max 5 Target Collaborators',
  args: {
    queueItems: [
      {
        ...DEFAULT_COLLAB_POSTS[0],
        id: 'queue-max',
        curationStatus: 'queued' as const,
        targetCollabAccounts: [
          'dressbyvayyari',
          'theblouseedition',
          'vayyari_littles',
          'vayyari_prive',
          'editionsbyvayyari',
        ],
      },
    ],
  },
};

/**
 * Story 3: Empty Queue State
 * Cheerful empty state with CTA to return to Collab Planner.
 */
export const EmptyQueueState: Story = {
  name: '3. Empty Queue: All Caught Up',
  args: {
    queueItems: [],
  },
};

/**
 * Story 4: Loading State
 * Spinner displayed while active queue is being fetched from the server.
 */
export const LoadingQueueState: Story = {
  name: '4. Loading Queue State',
  args: {
    queueItems: [],
    loading: true,
  },
};
