export interface PlannedProductCollabInfo {
  collabChannelId?: string;
  collabChannelUsername?: string;
  collabStatus?: 'none' | 'invite_pending' | 'collab_accepted' | 'collab_declined';
  publishedShortcode?: string;
  publishedUrl?: string;
}

export interface PlannedProductInfo {
  id: string;
  productCode: string;
  title: string;
  price: number;
  category: string;
  fabric?: string;
  imageUri?: string;
  isStarred?: boolean;
  assignedChannelIds?: string[];
  planningStatus?: 'complete' | 'in_progress';
  collabInfo?: PlannedProductCollabInfo;
  targetCollabUsername?: string;
  collabStatus?: 'none' | 'invite_pending' | 'collab_accepted' | 'collab_declined';
}

export interface TargetChannelOption {
  id: string;
  username: string;
  displayName?: string;
  channelType: 'focus' | 'dump';
  niche?: string;
  avatarUri?: string;
  isSuggestedMatch?: boolean;
}

export interface ChannelSharingQueueItem extends PlannedProductInfo {
  status: 'assigned' | 'scheduled' | 'shared' | 'excluded';
  scheduledTimeLabel?: string;
}

