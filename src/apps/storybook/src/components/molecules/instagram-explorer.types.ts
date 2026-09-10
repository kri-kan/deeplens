export interface InstagramExplorerProfile {
  id: string;
  username: string;
  fullName?: string;
  avatarUri?: string;
  isPinned?: boolean;
  isActive?: boolean;
  profileCategory: string; // 'mybusiness' | 'general' | 'competitors' | string
  postCount?: number;
  lastSyncedAt?: string;
}

export interface ProfileCategoryGroup {
  id: string;
  title: string;
  count?: number;
  isExpanded?: boolean;
  profiles: InstagramExplorerProfile[];
}

export type PlannerActionId =
  | 'curation'
  | 'sharing'
  | 'swipes'
  | 'review'
  | 'post_planner'
  | 'incubator'
  | string;

export interface PlannerAction {
  id: PlannerActionId;
  title: string;
  badgeCount?: number;
  badgeVariant?: 'error' | 'warning' | 'primary';
}

// Backward compatibility aliases
export type StoryPlannerActionId = PlannerActionId;
export type StoryPlannerAction = PlannerAction;
