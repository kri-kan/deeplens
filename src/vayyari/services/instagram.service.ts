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
  lastSyncedAt?: string;
  isInWatchlist?: boolean;
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
    return searchApiClient.get<InstagramProfile[]>('/api/v1/Insta');
  };

  getProfileDetails = async (username: string, sortBy = 'date', sortOrder = 'desc', fromDate?: string, toDate?: string): Promise<ProfileDetailsResponse> => {
    let url = `/api/v1/Insta/profile/${username}?sortBy=${sortBy}&sortOrder=${sortOrder}`;
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

  exchangeToken = async (shortLivedToken: string): Promise<{ message: string }> => {
    return searchApiClient.post('/api/v1/Insta/token/exchange', shortLivedToken);
  };

  getQuota = async (): Promise<MetaQuotaInfo> => {
    return searchApiClient.get<MetaQuotaInfo>('/api/v1/Insta/quota');
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
}

export const instagramService = new InstagramService();
