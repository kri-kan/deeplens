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
}

export interface TargetChannelOption {
  id: string;
  username: string;
  channelType: 'focus' | 'dump';
  niche?: string;
  avatarUri?: string;
  isSuggestedMatch?: boolean;
}

export interface ChannelSharingQueueItem extends PlannedProductInfo {
  status: 'assigned' | 'scheduled' | 'shared' | 'excluded';
  scheduledTimeLabel?: string;
}
