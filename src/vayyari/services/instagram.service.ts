import { searchApiClient } from '../api/client';
import type { InstagramLink } from '../utils/instagram-helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export enum InstagramMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL_ALBUM = 'CAROUSEL_ALBUM',
  UNKNOWN = 'UNKNOWN'
}

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followingCount?: number;
  mediaCount: number;
  profilePictureUrl?: string;
  storagePath?: string;
  isActive: boolean;
  isOwnAccount: boolean;
  isDataDeleted: boolean;
  isPinned?: boolean;
  lastSyncedAt?: string;
  isInWatchlist?: boolean;
  storiesPostedLast24h?: number;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  likeCount: number;
  commentCount: number;
  timestamp?: string;
  mediaType?: InstagramMediaType | string;
  mediaProductType?: string;
  storagePath?: string;
  productCode?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  status?: 'active' | 'suspend' | 'ignore';
  suspendUntil?: string;
  lastReviewedAt?: string;
  ownerUsername?: string;
  ownerProfilePictureUrl?: string;
  isStarred?: boolean;
  lastPostedAt?: string;
  rightSwipes?: number;
  leftSwipes?: number;
  shareCount?: number;
  sharedAt?: string;
}

export interface ProfileMetrics {
  avgLikes: number;
  engagementRate: number;
  postFrequency: number;
}

export interface ProfileDetailsResponse {
  profile: {
    userId: string;
    username: string;
    name?: string;
    biography?: string;
    followersCount: number;
    followingCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
    storagePath?: string;
    website?: string;
    isActive: boolean;
    isVerified: boolean;
    isBusiness: boolean;
    isOwnAccount: boolean;
    lastSyncedAt?: string;
    isDataDeleted: boolean;
  };
  videos: InstagramPost[];
  metrics: ProfileMetrics;
}

export interface SyncResult {
  message: string;
  profile: any;
  postCount: number;
  posts: InstagramPost[];
  newPosts?: number;
  engagementUpdated?: number;
  jobId?: string;
}

export interface TokenHealth {
  lastRefreshed: string;
  expiresAt: string;
  daysRemaining: number;
  needsRefresh: boolean;
  isExpired: boolean;
}

export interface ScraperJob {
  id: string;
  username: string;
  jobType: string;
  status: string;
  targetCount: number;
  scrapedCount: number;
  priority: number;
  nextRunAt?: string;
  completedAt?: string;
  origin?: string;
}

export interface MetaQuotaInfo {
  requestsInLastHour: number;
  estimatedRemainingRequests: number;
  metrics: {
    callCount: number;
    totalCpuTime: number;
    totalTime: number;
  };
  lastUpdated: string;
}

// ── Data Normalization ────────────────────────────────────────────────────────

export const mapToMediaType = (rawType: any): InstagramMediaType => {
  if (rawType === undefined || rawType === null) return InstagramMediaType.UNKNOWN;
  const typeStr = rawType.toString().toUpperCase();

  if (typeStr === 'VIDEO' || typeStr === 'REEL' || typeStr === '2' || typeStr === '10' || rawType === 2 || rawType === 10) {
      return InstagramMediaType.VIDEO;
  }
  if (typeStr === 'IMAGE' || typeStr === '1' || rawType === 1) {
      return InstagramMediaType.IMAGE;
  }
  if (typeStr === 'CAROUSEL_ALBUM' || typeStr === 'CAROUSEL' || typeStr === '8' || rawType === 8) {
      return InstagramMediaType.CAROUSEL_ALBUM;
  }
  return InstagramMediaType.UNKNOWN;
};

export const normalizeProfile = (data: any): InstagramProfile => {
  if (!data) return {} as InstagramProfile;
  return {
      ...data,
      id: data.id || data.Id || data.userId || data.UserId,
      username: data.username || data.Username,
      name: data.name || data.Name,
      biography: data.biography || data.Biography,
      followersCount: data.followersCount || data.FollowersCount || 0,
      followingCount: data.followingCount || data.FollowingCount || 0,
      mediaCount: data.mediaCount || data.MediaCount || 0,
      profilePictureUrl: data.profilePictureUrl || data.ProfilePictureUrl,
      storagePath: data.storagePath || data.StoragePath,
      isPinned: data.isPinned !== undefined ? data.isPinned : data.IsPinned,
      lastSyncedAt: data.lastSyncedAt || data.LastSyncedAt || data.lastScrapedAt || data.LastScrapedAt,
      storiesPostedLast24h: data.storiesPostedLast24h !== undefined ? data.storiesPostedLast24h : (data.StoriesPostedLast24h || 0),
  };
};

export const normalizeData = (data: any): InstagramPost => {
  if (!data) return {} as InstagramPost;
  const id = data.id || data.Id || data.platformId || data.PlatformId;
  const rawMediaType = data.mediaType !== undefined ? data.mediaType : data.MediaType;
  const mediaType = mapToMediaType(rawMediaType);
  const storagePath = data.storagePath || data.StoragePath;
  const thumbnailUrl = data.thumbnailUrl || data.ThumbnailUrl;
  const mediaUrl = data.mediaUrl || data.MediaUrl;
  const permalink = data.permalink || data.Permalink;

  return {
      ...data,
      id,
      mediaType,
      storagePath,
      thumbnailUrl,
      mediaUrl,
      permalink,
      likeCount: data.likeCount || data.LikeCount || 0,
      commentCount: data.commentCount || data.CommentCount || 0,
      caption: data.caption || data.Caption || data.description || data.title,
      productCode: data.productCode || data.ProductCode,
      youtubeVideoId: data.youtubeVideoId || data.YoutubeVideoId,
      youtubeUrl: data.youtubeUrl || data.YoutubeUrl,
      isStarred: data.isStarred !== undefined ? data.isStarred : data.IsStarred,
      lastPostedAt: data.lastPostedAt || data.LastPostedAt,
      rightSwipes: data.rightSwipes ?? data.RightSwipes ?? 0,
      leftSwipes: data.leftSwipes ?? data.LeftSwipes ?? 0,
      shareCount: data.shareCount ?? data.ShareCount ?? 0,
  };
};

// ── Service ───────────────────────────────────────────────────────────────────

class InstagramService {
  private _lastFetchedPosts: InstagramPost[] = [];

  setLastFetchedPosts(posts: InstagramPost[]) {
    this._lastFetchedPosts = posts;
  }

  getLastFetchedPosts(): InstagramPost[] {
    return this._lastFetchedPosts;
  }

  // ── Watchlist Management ────────────────────────────────────────────────────

  getWatchlist = async (): Promise<InstagramProfile[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta');
    return raw ? raw.map(normalizeProfile) : [];
  };

  getRecentStories = async (profileId: string): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/watchlist/${profileId}/recent-stories`);
    return raw ? raw.map(normalizeData) : [];
  };

  getProfileDetails = async (username: string, sortBy = 'date', sortOrder = 'desc', fromDate?: string, toDate?: string, limit = 100, offset = 0): Promise<ProfileDetailsResponse> => {
    let url = `/api/v1/Insta/profile/${username}?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=${limit}&offset=${offset}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return searchApiClient.get<ProfileDetailsResponse>(url);
  };

  addToWatchlist = async (username: string): Promise<{ message: string; profile: InstagramProfile }> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}`);
  };

  removeFromWatchlist = async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}`);
  };

  deleteProfileData = async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}/data`);
  };

  // ── On-Demand Sync (Graph API) ──────────────────────────────────────────────

  syncProfile = async (username: string, maxPosts = 50): Promise<SyncResult> => {
    return searchApiClient.post<SyncResult>(`/api/v1/Insta/profile/${username}/sync?maxPosts=${maxPosts}`);
  };

  // ── Token Management ────────────────────────────────────────────────────────

  getTokenHealth = async (): Promise<TokenHealth> => {
    return searchApiClient.get<TokenHealth>('/api/v1/Insta/token');
  };

  refreshToken = async (): Promise<{ message: string; health: TokenHealth }> => {
    return searchApiClient.post('/api/v1/Insta/token/refresh');
  };

  exchangeToken = async (shortLivedToken: string, appId?: string, appSecret?: string): Promise<{ message: string; token: string }> => {
    return searchApiClient.post('/api/v1/Insta/token/exchange', { shortLivedToken, appId, appSecret });
  };

  getQuota = async (): Promise<MetaQuotaInfo> => {
    return searchApiClient.get<MetaQuotaInfo>('/api/v1/Insta/quota');
  };


  // ── Configuration Management ────────────────────────────────────────────────

  getConfigurations = async (): Promise<any[]> => {
    return searchApiClient.get<any[]>("/api/v1/Insta/config");
  };

  createConfiguration = async (config: any): Promise<any> => {
    return searchApiClient.post("/api/v1/Insta/config", config);
  };

  updateConfiguration = async (id: string, config: any): Promise<void> => {
    return searchApiClient.put(`/api/v1/Insta/config/${id}`, config);
  };

  deleteConfiguration = async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/config/${id}`);
  };

  setDefaultConfiguration = async (id: string): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/config/${id}/default`, {});
  };
  // ── Job & Queue Management ──────────────────────────────────────────────────

  getActiveJobs = async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/active');
  };

  getJobHistory = async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/history');
  };

  createJob = async (payload: any): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs', payload);
  };

  updateJob = async (id: string, payload: any): Promise<void> => {
    return searchApiClient.patch(`/api/v1/Insta/jobs/${id}`, payload);
  };

  getJobLogs = async (jobId: string): Promise<any[]> => {
    return searchApiClient.get<any[]>(`/api/v1/Insta/jobs/${jobId}/logs`);
  };

  toggleWatchStatus = async (username: string, active: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/watchlist/toggle?username=${username}&active=${active}`, {});
  };

  toggleOwnAccount = async (username: string, isOwn: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}/toggle-own?isOwn=${isOwn}`, {});
  };

  togglePinStatus = async (username: string, isPinned: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}/toggle-pin?isPinned=${isPinned}`, {});
  };

  deleteJob = async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/jobs/${id}`);
  };

  healQueue = async (): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs/heal');
  };

  lookupPost = async (url: string): Promise<InstagramPost> => {
    return searchApiClient.get<InstagramPost>(`/api/v1/Insta/video/lookup?url=${encodeURIComponent(url)}`);
  };

  getVideoDetails = async (id: string): Promise<InstagramPost> => {
    return searchApiClient.get<InstagramPost>(`/api/v1/Insta/video/${id}`);
  };

  updateVideoStatus = async (id: string, payload: { status?: 'active' | 'suspend' | 'ignore'; suspendDays?: number; lastReviewedAt?: string }): Promise<{ success: boolean }> => {
    return searchApiClient.patch(`/api/v1/Insta/video/${id}`, payload);
  };

  getSuspendedVideos = async (): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/videos/suspended');
    return raw ? raw.map(normalizeData) : [];
  };

  getIgnoredVideos = async (): Promise<InstagramPost[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/videos/ignored');
    return raw ? raw.map(normalizeData) : [];
  };

  getOwnAccountsVideos = async (sortBy = 'date', sortOrder = 'desc', limit = 100, offset = 0, search?: string): Promise<InstagramPost[]> => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/own-accounts/videos?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=${limit}&offset=${offset}${searchParam}`);
    return raw ? raw.map(normalizeData) : [];
  };



  getPostMedia = async (id: string): Promise<InstagramPost[]> => {
    return searchApiClient.get<InstagramPost[]>(`/api/v1/Insta/video/${id}/media`);
  };

  getInstagramLinksAsync = async (id: string): Promise<InstagramLink[]> => {
    return searchApiClient.get<InstagramLink[]>(`/api/v1/products/instagram/${id}/links`);
  };

  unlinkInstagramPostAsync = async (postId: string, productId: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/products/instagram/${postId}/links/${productId}`);
  };

  refreshPostMedia = async (id: string): Promise<{ message: string }> => {
    return searchApiClient.post(`/api/v1/Insta/video/${id}/refresh`);
  };

  updateYoutubeStatus = async (id: string, data: any): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/video/${id}/youtube`, data);
  };

  syncPostComments = async (competitorVideoId: string, accessToken: string, deepSync = false): Promise<void> => {
    return searchApiClient.post(`/api/v1/Insta/video/${competitorVideoId}/comments/sync`, { accessToken, deepSync });
  };

  /**
   * Gets list of synchronized comments for a specific post.
   */
  getPostComments = async (competitorVideoId: string): Promise<InstagramComment[]> => {
    return searchApiClient.get<InstagramComment[]>(`/api/v1/Insta/video/${competitorVideoId}/comments`);
  };

  // ── Story Planner ─────────────────────────────────────────────────────────

  getStoryGroups = async (search?: string): Promise<StoryGroup[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const raw = await searchApiClient.get<any[]>(`/api/v1/Insta/story-groups${searchParam}`);
    return raw.map(g => ({
      ...g,
      posts: g.posts ? g.posts.map(normalizeData) : []
    })) as StoryGroup[];
  };

  getStoryGroup = async (id: string): Promise<StoryGroup> => {
    const raw = await searchApiClient.get<any>(`/api/v1/Insta/story-groups/${id}`);
    return {
      ...raw,
      posts: raw.posts ? raw.posts.map(normalizeData) : []
    } as StoryGroup;
  };

  createStoryGroup = async (payload: CreateStoryGroupPayload): Promise<{ success: boolean; groupId: string }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups', payload);
  };

  updateStoryGroup = async (id: string, payload: UpdateStoryGroupPayload): Promise<{ success: boolean }> => {
    return searchApiClient.patch(`/api/v1/Insta/story-groups/${id}`, payload);
  };

  renewStoryGroup = async (id: string): Promise<{ success: boolean }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/renew`, {});
  };

  mergeStoryGroups = async (group1Id: string, group2Id: string): Promise<{ success: boolean; parentGroupId: string; mergedGroupId: string }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups/merge', { group1Id, group2Id });
  };

  deleteStoryGroup = async (id: string): Promise<{ success: boolean }> => {
    return searchApiClient.delete(`/api/v1/Insta/story-groups/${id}`);
  };

  markGroupPosted = async (id: string, targetWatchlistId: string): Promise<{ success: boolean; historyId: string }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/post?targetWatchlistId=${targetWatchlistId}`, {});
  };

  markPostPosted = async (id: string, targetWatchlistId: string, groupId?: string): Promise<{ success: boolean; historyId: string }> => {
    const groupParam = groupId ? `&groupId=${groupId}` : '';
    return searchApiClient.post(`/api/v1/Insta/story-posts/${id}/post?targetWatchlistId=${targetWatchlistId}${groupParam}`, {});
  };

  finishStoryGroup = async (id: string): Promise<{ success: boolean }> => {
    return searchApiClient.post(`/api/v1/Insta/story-groups/${id}/finish`, {});
  };

  getEligibleShares = async (targetWatchlistId: string, limit = 50, offset = 0): Promise<{ items: UnifiedPlannerItem[]; totalCount: number }> => {
    const raw = await searchApiClient.get<{ items: any[]; totalCount: number }>(
      `/api/v1/Insta/story-planner/eligible/${targetWatchlistId}?limit=${limit}&offset=${offset}`
    );
    const items = ((raw && raw.items) || []).map(item => {
      if (item.type === 'post' && item.post) {
        return {
          ...item,
          post: normalizeData(item.post)
        };
      } else if (item.type === 'group' && item.group) {
        return {
          ...item,
          group: {
            ...item.group,
            posts: item.group.posts ? item.group.posts.map(normalizeData) : []
          }
        };
      }
      return item;
    }) as UnifiedPlannerItem[];
    return {
      items,
      totalCount: raw?.totalCount || 0
    };
  };

  getPendingSwipeCards = async (): Promise<StoryPostingHistory[]> => {
    const raw = await searchApiClient.get<any[]>('/api/v1/Insta/story-groups/pending-swipes');
    return (raw || []).map(h => ({
      ...h,
      post: h.post ? normalizeData(h.post) : undefined,
      posts: h.posts ? h.posts.map(normalizeData) : []
    })) as StoryPostingHistory[];
  };

  submitSwipes = async (swipes: SwipeResponseItem[]): Promise<{ success: boolean }> => {
    return searchApiClient.post('/api/v1/Insta/story-groups/swipes', swipes);
  };

  suggestGroupMetadata = async (postIds: string[]): Promise<{ title: string; keywords: string }> => {
    return searchApiClient.post('/api/v1/Insta/suggest-group-metadata', { postIds });
  };

  getStoryPlannerFeed = async (limit = 100, offset = 0, search?: string, sortAsc = false): Promise<{ items: UnifiedPlannerItem[]; totalCount: number; groupCount: number }> => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortParam = `&sortAsc=${sortAsc}`;
    const raw = await searchApiClient.get<{ items: any[]; totalCount: number; groupCount: number }>(`/api/v1/Insta/story-planner/feed?limit=${limit}&offset=${offset}${searchParam}${sortParam}`);
    const items = ((raw && raw.items) || []).map(item => {
      if (item.type === 'post' && item.post) {
        return {
          ...item,
          post: normalizeData(item.post)
        };
      } else if (item.type === 'group' && item.group) {
        return {
          ...item,
          group: {
            ...item.group,
            posts: item.group.posts ? item.group.posts.map(normalizeData) : []
          }
        };
      }
      return item;
    }) as UnifiedPlannerItem[];
    return {
      items,
      totalCount: raw?.totalCount || 0,
      groupCount: raw?.groupCount || 0
    };
  };
}

export interface UnifiedPlannerItem {
  type: 'post' | 'group';
  id: string;
  timestamp: string;
  post?: InstagramPost;
  group?: StoryGroup;
}

export interface InstagramComment {
  id: string;
  commentText: string;
  postedAt: string;
  likeCount: number;
  isHidden: boolean;
  username?: string;
  fullName?: string;
}

export interface StoryGroup {
  id: string;
  name: string;
  status: 'active' | 'suspend' | 'ignore';
  suspendUntil?: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  posts: InstagramPost[];
  eligibleAccounts: string[];
  needsReview: boolean;
  keywords?: string;
  rightSwipes?: number;
  leftSwipes?: number;
  shareCount?: number;
  lastPostedAt?: string;
}

export interface CreateStoryGroupPayload {
  name: string;
  postIds: string[];
  targetWatchlistIds: string[];
  keywords?: string;
}

export interface UpdateStoryGroupPayload {
  name?: string;
  status?: 'active' | 'suspend' | 'ignore';
  suspendDays?: number;
  postIds?: string[];
  starredPostIds?: string[];
  targetWatchlistIds?: string[];
  keywords?: string;
}

export interface StoryPostingHistory {
  id: string;
  groupId?: string;
  groupName?: string;
  postId?: string;
  targetWatchlistId: string;
  targetUsername: string;
  postedAt: string;
  swipeStatus: 'pending' | 'left' | 'right';
  swipedAt?: string;
  post?: InstagramPost;
  posts: InstagramPost[];
}

export interface SwipeResponseItem {
  historyId: string;
  direction: 'left' | 'right';
}

export const instagramService = new InstagramService();

