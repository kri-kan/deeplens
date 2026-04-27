import { competitorApiClient } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  follower_count: number;
  following_count?: number;
  post_count: number;
  profile_pic_url?: string;
  last_scraped_at?: string;
  is_active?: boolean;
}

export interface InstagramPost {
  id: string;
  platform_post_id: string;
  url?: string;
  thumbnail_url?: string;
  caption?: string;
  media_type?: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  posted_at?: string;
}

export interface FollowerSnapshot {
  follower_count: number;
  snapshot_at: string;
}

export interface ProfileDetailsResponse {
  profile: InstagramProfile;
  videos: InstagramPost[];
  growth: FollowerSnapshot[];
}

export interface SyncResult {
  status: string;
  profile: {
    username: string;
    display_name?: string;
    follower_count: number;
    post_count: number;
    last_scraped_at: string;
  };
  new_posts: number;
  engagement_updated: number;
  total_posts: number;
}

export interface TokenHealth {
  last_refreshed: string;
  expires_at: string;
  days_remaining: number;
  needs_refresh: boolean;
  is_expired: boolean;
}

export interface ScraperJob {
  id: string;
  username: string;
  watchlist_id: string;
  job_type: string;
  status: string;
  priority: number;
  origin: string;
  next_run_at?: string;
  scraped_count: number;
  error_message?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

// All Instagram intelligence routes through the C# CompetitorIntel.Orchestrator.
// The Python sidecar service has been replaced by the Meta Graph API v25.0.
export const instagramService = {

  // ── Watchlist Management ────────────────────────────────────────────────────

  getWatchlist: async (): Promise<InstagramProfile[]> => {
    return competitorApiClient.get<InstagramProfile[]>('/api/Competitor');
  },

  getProfileDetails: async (username: string): Promise<ProfileDetailsResponse> => {
    return competitorApiClient.get<ProfileDetailsResponse>(`/api/Competitor/${username}`);
  },

  addToWatchlist: async (username: string): Promise<{ message: string; profile: InstagramProfile }> => {
    return competitorApiClient.post(`/api/Competitor/${username}`);
  },

  removeFromWatchlist: async (username: string): Promise<void> => {
    return competitorApiClient.delete(`/api/Competitor/${username}`);
  },

  updateConfig: async (id: string, config: { isActive?: boolean; frequencyProfileMins?: number }): Promise<void> => {
    return competitorApiClient.post(`/api/Competitor/${id}/config`, config);
  },

  // ── On-Demand Sync (Graph API) ──────────────────────────────────────────────

  /**
   * Triggers a live Graph API sync for a single profile:
   * profile data → new posts → engagement refresh.
   * Returns a summary of what was inserted/updated.
   */
  syncProfile: async (username: string): Promise<SyncResult> => {
    return competitorApiClient.post<SyncResult>(`/api/Competitor/${username}/sync`);
  },

  // ── Scraper Job Queue ───────────────────────────────────────────────────────

  getActiveJobs: async (): Promise<ScraperJob[]> => {
    return competitorApiClient.get<ScraperJob[]>('/api/ScraperManager/active');
  },

  getJobHistory: async (limit = 50): Promise<ScraperJob[]> => {
    return competitorApiClient.get<ScraperJob[]>('/api/ScraperManager/history', { params: { limit } });
  },

  createJob: async (watchlistId: string, jobType = 'routine', priority = 5): Promise<any> => {
    return competitorApiClient.post('/api/ScraperManager/job', { watchlistId, jobType, priority });
  },

  deleteJob: async (id: string): Promise<void> => {
    return competitorApiClient.delete(`/api/ScraperManager/job/${id}`);
  },

  updateJob: async (id: string, updates: { priority?: number; status?: string }): Promise<void> => {
    return competitorApiClient.patch(`/api/ScraperManager/job/${id}`, updates);
  },

  healQueue: async (): Promise<{ pruned: number }> => {
    return competitorApiClient.post('/api/ScraperManager/heal');
  },

  // ── Token Management ────────────────────────────────────────────────────────

  /**
   * Returns health info for the Meta long-lived access token.
   * days_remaining < 10 → urgent action needed.
   */
  getTokenHealth: async (): Promise<TokenHealth> => {
    return competitorApiClient.get<TokenHealth>('/api/ScraperManager/token');
  },

  /**
   * Manually triggers the token refresh via graph.instagram.com.
   * Resets the 60-day expiry clock.
   */
  refreshToken: async (): Promise<{ message: string; health: TokenHealth }> => {
    return competitorApiClient.post('/api/ScraperManager/token/refresh');
  },
};
