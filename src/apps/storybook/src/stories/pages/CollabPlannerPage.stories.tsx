import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminCollabPlannerPage,
  DEFAULT_COLLAB_ACCOUNTS,
  DEFAULT_COLLAB_CHANNELS,
  DEFAULT_COLLAB_POSTS,
} from '../../components/pages/AdminCollabPlannerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Collab Planner',
  component: AdminCollabPlannerPage,
  decorators: [withFormFactor('mobile', 'Collab Planner (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    channels: DEFAULT_COLLAB_CHANNELS,
    accounts: DEFAULT_COLLAB_ACCOUNTS,
    posts: DEFAULT_COLLAB_POSTS,
    activeChannelId: 'vayyari_fashions',
    showCurated: false,
    curationModalOpen: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * Story 1: Default (Uncurated Posts Only, @vayyari_fashions selected)
 * Clean initial view showing pending posts awaiting collab curation.
 */
export const DefaultUncuratedOnly: Story = {
  name: '1. Default: Uncurated Posts Only (@vayyari_fashions)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: false,
    curationModalOpen: false,
  },
};

/**
 * Story 2: Show All Toggle Active (showing curated, queued, and completed posts)
 * Toggle switch turned ON displaying curated badges (green), queued (purple),
 * and completed (blue) alongside pending items.
 */
export const ShowAllToggleActive: Story = {
  name: '2. Show All Toggle Active (Curated, Queued & Completed)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: true,
    curationModalOpen: false,
  },
};

/**
 * Story 3: Curation Modal Open - No Changes ("Mark as Collab Curated" primary CTA)
 * Modal opened on an uncurated post with initial target collab accounts unchanged.
 * Primary CTA is the single green "Mark as Collab Curated" button.
 */
export const CurationModalNoChanges: Story = {
  name: '3. Curation Modal Open - No Changes ("Mark as Collab Curated")',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: [],
  },
};

/**
 * Story 4: Curation Modal Open - 3 Accounts Selected ("Queue for Collab Automation" dynamic CTA)
 * Operator has selected 3 collaboration channels (@dressbyvayyari, @theblouseedition, @vayyari_littles).
 * Primary CTA dynamically transforms into purple "Queue for Collab Automation" with sparkles icon,
 * and secondary CTA is the subtle green outlined "Mark as Collab Curated".
 */
export const CurationModalThreeAccountsSelected: Story = {
  name: '4. Curation Modal Open - 3 Accounts ("Queue for Collab Automation")',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: ['p-2', 'p-6', 'p-7'],
  },
};

/**
 * Story 5: Curation Modal Open - Max 5 Accounts Selected
 * 5 accounts selected hitting the Instagram hard limit. Counter displays "5 / 5 Selected" (red highlight),
 * unselected accounts are dimmed and disabled.
 */
export const CurationModalMaxFiveAccounts: Story = {
  name: '5. Curation Modal Open - Max 5 Accounts Selected (Limit)',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: ['p-1', 'p-2', 'p-4', 'p-5', 'p-6'],
  },
};

/**
 * Story 6: Automation Queue Active State
 * Screen with the AVD Maestro automation queue actively processing posts.
 * Header status pill displays "Queue Active" with purple pulse highlight.
 */
export const AutomationQueueActiveState: Story = {
  name: '6. Automation Queue Active State',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: true,
    isAutomationQueueActive: true,
    curationModalOpen: false,
  },
};

/**
 * Story 7: Empty State (All Caught Up)
 * Selected channel has zero pending items. Displays cheerful "All caught up!"
 * illustration with CTA to view already curated posts.
 */
export const EmptyStateAllCaughtUp: Story = {
  name: '7. Empty State (All Caught Up - Zero Uncurated)',
  args: {
    activeChannelId: 'theblouseedition',
    showCurated: false,
    posts: [
      {
        id: 'post-201-done',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
        ownerUsername: 'theblouseedition',
        ownerAvatarUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&q=80',
        caption: 'Heavy maggam work bridal blouse already completed.',
        postedAt: '1d ago',
        curationStatus: 'completed',
      },
    ],
    curationModalOpen: false,
  },
};
