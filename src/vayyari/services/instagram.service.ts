import { searchApiClient } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followsCount?: number;
  mediaCount: number;
  profilePictureUrl?: string;
  lastSyncedAt?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  likeCount: number;
  commentsCount: number;
  timestamp?: string;
  mediaType?: string;
  mediaProductType?: string;
}

export interface ProfileDetailsResponse {
  profile: {
    username: string;
    name?: string;
    biography?: string;
    followersCount: number;
    followsCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
    website?: string;
    is_active: boolean;
    is_verified: boolean;
    is_business: boolean;
    last_synced_at?: string;
    is_data_deleted: boolean;
  };
  videos: any[];
  metrics: {
    avgLikes: number;
    engagementRate: number;
    postFrequency: number;
  };
}

export interface SyncResult {
  message: string;
  profile: any;
  postCount: number;
  posts: any[];
  new_posts?: number;
  engagement_updated?: number;
  jobId?: string;
}

export interface TokenHealth {
  lastRefreshed: string;
  expiresAt: string;
  daysRemaining: number;
  needsRefresh: boolean;
  isExpired: boolean;
}

export interface InstagramVideo {
  id: string;
  caption?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  permalink?: string;
  likeCount: number;
  commentsCount: number;
  timestamp?: string;
  mediaType?: string;
}

export interface ScraperJob {
  id: string;
  username: string;
  job_type: string;
  status: string;
  target_count: number;
  scraped_count: number;
  priority: number;
  next_run_at?: string;
  completed_at?: string;
  origin?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const instagramService = {

  // ── Watchlist Management ────────────────────────────────────────────────────

  getWatchlist: async (): Promise<InstagramProfile[]> => {
    return searchApiClient.get<InstagramProfile[]>('/api/v1/Insta');
  },

  getProfileDetails: async (username: string, sortBy: string = 'date', sortOrder: string = 'desc', fromDate?: string, toDate?: string): Promise<any> => {
    let url = `/api/v1/Insta/profile/${username}?sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return searchApiClient.get(url);
  },

  addToWatchlist: async (username: string): Promise<{ message: string; profile: InstagramProfile }> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}`);
  },

  removeFromWatchlist: async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}`);
  },

  deleteProfileData: async (username: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/profile/${username}/data`);
  },

  // ── On-Demand Sync (Graph API) ──────────────────────────────────────────────

  syncProfile: async (username: string, maxPosts: number = 50): Promise<SyncResult> => {
    return searchApiClient.post<SyncResult>(`/api/v1/Insta/profile/${username}/sync?maxPosts=${maxPosts}`);
  },

  // ── Token Management ────────────────────────────────────────────────────────

  getTokenHealth: async (): Promise<TokenHealth> => {
    return searchApiClient.get<TokenHealth>('/api/v1/Insta/token');
  },

  refreshToken: async (): Promise<{ message: string; health: TokenHealth }> => {
    return searchApiClient.post('/api/v1/Insta/token/refresh');
  },

  exchangeToken: async (shortLivedToken: string): Promise<{ message: string }> => {
    return searchApiClient.post('/api/v1/Insta/token/exchange', shortLivedToken);
  },

  getQuota: async (): Promise<MetaQuotaInfo> => {
    return searchApiClient.get<MetaQuotaInfo>('/api/v1/Insta/quota');
  },

  // ── Job & Queue Management ──────────────────────────────────────────────────

  getActiveJobs: async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/active');
  },

  getJobHistory: async (): Promise<ScraperJob[]> => {
    return searchApiClient.get<ScraperJob[]>('/api/v1/Insta/jobs/history');
  },

  createJob: async (payload: any): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs', payload);
  },

  updateJob: async (id: string, payload: any): Promise<void> => {
    return searchApiClient.patch(`/api/v1/Insta/jobs/${id}`, payload);
  },

  getJobLogs: async (jobId: string): Promise<any[]> => {
    return searchApiClient.get<any[]>(`/api/v1/Insta/jobs/${jobId}/logs`);
  },

  toggleWatchStatus: async (username: string, active: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/watchlist/toggle?username=${username}&active=${active}`, {});
  },

  toggleOwnAccount: async (username: string, isOwn: boolean): Promise<any> => {
    return searchApiClient.post(`/api/v1/Insta/profile/${username}/toggle-own?isOwn=${isOwn}`, {});
  },

  deleteJob: async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/Insta/jobs/${id}`);
  },

  healQueue: async (): Promise<void> => {
    return searchApiClient.post('/api/v1/Insta/jobs/heal');
  },
  
  lookupPost: async (url: string): Promise<any> => {
    return searchApiClient.get(`/api/v1/Insta/video/lookup?url=${encodeURIComponent(url)}`);
  },

  getVideoDetails: async (id: string): Promise<any> => {
    return searchApiClient.get(`/api/v1/Insta/video/${id}`);
  },
};

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
