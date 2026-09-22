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
    queueDrawerOpen: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * Story 1: Default (Primary Business Account @vayyari_fashions, Uncurated Posts Only)
 * Clean initial view showing pending posts awaiting collab curation for primary brand.
 */
export const DefaultUncuratedVayyariFashions: Story = {
  name: '1. Default: Uncurated Posts (@vayyari_fashions)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: false,
    curationModalOpen: false,
  },
};

/**
 * Story 2: Channel Filtered (@theblouseedition)
 * Filtered to dedicated bridal blouse channel with real brand posts.
 */
export const ChannelFilteredTheBlouseEdition: Story = {
  name: '2. Channel Filtered (@theblouseedition)',
  args: {
    activeChannelId: 'theblouseedition',
    showCurated: false,
    curationModalOpen: false,
  },
};

/**
 * Story 3: Show All Toggle Active (showing curated, queued, and completed posts)
 * Toggle switch turned ON displaying curated badges (green), queued (purple),
 * and completed (blue) alongside pending items.
 */
export const ShowAllToggleActive: Story = {
  name: '3. Show All Toggle Active (Curated, Queued & Completed)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: true,
    curationModalOpen: false,
  },
};

/**
 * Story 4: Curation Modal Open - No Changes ("Mark as Collab Curated" primary CTA)
 * Modal opened on an uncurated post with initial target collab accounts unchanged.
 * Primary CTA is the single green "Mark as Collab Curated" button.
 */
export const CurationModalNoChanges: Story = {
  name: '4. Curation Modal Open - No Changes ("Mark as Collab Curated")',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: [],
  },
};

/**
 * Story 5: Curation Modal Open - 3 Accounts Selected ("Queue for Collab Automation" dynamic CTA)
 * Operator has selected 3 collaboration channels (@dressbyvayyari, @theblouseedition, @vayyari_littles).
 * Primary CTA dynamically transforms into purple "Queue for Collab Automation" with sparkles icon,
 * and secondary CTA is the subtle green outlined "Mark as Collab Curated".
 */
export const CurationModalThreeAccountsSelected: Story = {
  name: '5. Curation Modal Open - 3 Accounts ("Queue for Collab Automation")',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: ['dressbyvayyari', 'theblouseedition', 'vayyari_littles'],
  },
};

/**
 * Story 6: Curation Modal Open - Max 5 Accounts Selected
 * 5 accounts selected hitting the Instagram hard limit. Counter displays "5 / 5 Selected" (red highlight),
 * unselected accounts are dimmed and disabled.
 */
export const CurationModalMaxFiveAccounts: Story = {
  name: '6. Curation Modal Open - Max 5 Accounts Selected (Limit)',
  args: {
    activeChannelId: 'vayyari_fashions',
    curationModalOpen: true,
    selectedPost: DEFAULT_COLLAB_POSTS[0],
    initialModalSelectedAccountIds: [
      'dressbyvayyari',
      'theblouseedition',
      'vayyari_littles',
      'vayyari_prive',
      'editionsbyvayyari',
    ],
  },
};

/**
 * Story 7: Queue Icon Button Active State (Items Queued)
 * Header bar displays the compact "Curated" toggle switch alongside the purple
 * Queue Icon Button with an active badge counter (`{queuedPosts.length}`).
 */
export const AutomationQueueActiveState: Story = {
  name: '7. Queue Icon Button Active (Items Queued)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: true,
    isAutomationQueueActive: true,
    curationModalOpen: false,
  },
};

/**
 * Story 8: Empty State (All Caught Up)
 * Selected channel has zero pending items. Displays cheerful "All caught up!"
 * illustration with CTA to view already curated posts.
 */
export const EmptyStateAllCaughtUp: Story = {
  name: '8. Empty State (All Caught Up - Zero Uncurated)',
  args: {
    activeChannelId: 'theblouseedition',
    showCurated: false,
    posts: [
      {
        id: 'post-201-done',
        thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
        ownerUsername: 'theblouseedition',
        caption: 'Heavy maggam work bridal blouse already completed.',
        postedAt: '1d ago',
        curationStatus: 'completed',
      },
    ],
    curationModalOpen: false,
  },
};

/**
 * Story 9: Interactive Collab Automation Queue Drawer / Quick Inspection
 * Fallback slide-up drawer displaying queued posts, thumbnails, owner handles,
 * and target collaborator account badges.
 */
export const CollabQueueDrawerOpen: Story = {
  name: '9. Collab Automation Queue Drawer (Quick View)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: false,
    queueDrawerOpen: true,
    isAutomationQueueActive: true,
  },
};

/**
 * Story 10: Boosted Ad Post (Cannot Invite - Ad Promotion Locked)
 * Demonstrates a post with related active Instagram ad campaign where editing is blocked.
 * The post is gracefully marked as curated, existing collabs are captured as active,
 * and proposed accounts display "Cannot Invite (Boosted Ad)" chips.
 */
export const BoostedAdPostCannotInvite: Story = {
  name: '10. Boosted Ad Post (Ad Locked • Cannot Invite)',
  args: {
    activeChannelId: 'vayyari_fashions',
    showCurated: true,
    selectedPost: {
      id: 'post-boosted-ad-01',
      platformVideoId: '1800192837461',
      thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      ownerUsername: 'vayyari_fashions',
      caption: '🔥 Trending festive zari saree (Active Ad Promotion / Boosted).',
      likes: 4890,
      comments: 142,
      postedAt: '1d ago',
      curationStatus: 'collab_curated',
      collaborators: ['editionsbyvayyari'],
      targetCollabAccounts: ['editionsbyvayyari', 'everydayvayyari', 'vayyari_littles'],
      channelPhases: [
        { username: 'editionsbyvayyari', phase: 'already_collaborating', acceptedAt: '1d ago' },
        { username: 'everydayvayyari', phase: 'cant_invite', error: 'boosted_ad_cannot_edit' },
        { username: 'vayyari_littles', phase: 'cant_invite', error: 'boosted_ad_cannot_edit' },
      ],
    },
    curationModalOpen: true,
  },
};
