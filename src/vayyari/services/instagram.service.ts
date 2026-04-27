import { instagramApiClient, competitorApiClient } from '../api/client';

export interface InstagramProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  profile_pic_url?: string;
  last_scraped_at?: string;
}

export interface InstagramVideo {
  id: string;
  platform_video_id: string;
  url: string;
  media_type: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  thumbnail_url: string;
  posted_at: string;
}

export const instagramService = {
  // Watchlist Management (Direct to Sidecar Worker)
  getWatchlist: async (): Promise<InstagramProfile[]> => {
    return competitorApiClient.get<InstagramProfile[]>('/tracker/list');
  },

  getProfileDetails: async (username: string): Promise<{ profile: InstagramProfile; videos: InstagramVideo[] }> => {
    return competitorApiClient.get<{ profile: InstagramProfile; videos: InstagramVideo[] }>(`/tracker/profile/${username}`);
  },

  updateConfig: async (id: string, config: any): Promise<void> => {
    return competitorApiClient.post(`/tracker/config/${id}`, config);
  },

  // Queue Management (Direct to Sidecar Worker)
  getActiveJobs: async (): Promise<any[]> => {
    return competitorApiClient.get<any[]>('/tracker/queue/active');
  },

  getJobHistory: async (): Promise<any[]> => {
    return competitorApiClient.get<any[]>('/tracker/jobs/history');
  },

  createJob: async (request: any): Promise<any> => {
    // If we're passing it from a profile, request.watchlistId is the ID
    return competitorApiClient.post<any>(`/tracker/sync/${request.watchlistId}`);
  },

  deleteJob: async (id: string): Promise<void> => {
    return competitorApiClient.delete(`/tracker/jobs/${id}`);
  },

  updateJob: async (id: string, updates: any): Promise<void> => {
    return competitorApiClient.patch(`/tracker/jobs/${id}`, updates);
  },

  healQueue: async (): Promise<void> => {
    return competitorApiClient.post('/tracker/queue/heal');
  },

  // Direct Scraper Interaction
  syncProfile: async (username: string): Promise<any> => {
    return competitorApiClient.post<any>(`/tracker/sync/${username}`);
  },

  scrapeRaw: async (username: string): Promise<any> => {
    return instagramApiClient.get<any>(`/raw/profile/${username}`);
  }
};
