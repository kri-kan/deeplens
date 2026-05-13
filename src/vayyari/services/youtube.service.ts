import { searchApiClient } from '../api/client';

export interface YoutubeTokenHealth {
  lastRefreshed: string;
  needsRefresh: boolean;
  isAuthorized: boolean;
}

export interface YoutubeQuotaInfo {
  dailyLimit: number;
  currentUsage: number;
  remainingUnits: number;
  lastUpdated: string;
  hoursUntilReset: number;
  nextResetTime: string;
}

export interface YoutubeUploadRequest {
  mediaId: string;
  title: string;
  description: string;
  tags: string[];
  isShort: boolean;
  scheduleTime?: string;
}

export interface YoutubeUploadResponse {
  videoId: string;
  videoUrl: string;
  status: string;
  scheduledTime?: string;
}

class YoutubeService {
  getHealth = async (): Promise<YoutubeTokenHealth> => {
    return searchApiClient.get<YoutubeTokenHealth>('/api/v1/Youtube/health');
  };

  getQuota = async (): Promise<YoutubeQuotaInfo> => {
    return searchApiClient.get<YoutubeQuotaInfo>('/api/v1/Youtube/quota');
  };

  authenticate = async (code: string, redirectUri: string): Promise<void> => {
    return searchApiClient.post(`/api/v1/Youtube/auth?code=${code}&redirectUri=${encodeURIComponent(redirectUri)}`);
  };

  getAuthUrl = async (redirectUri: string): Promise<{ url: string }> => {
    return searchApiClient.get<{ url: string }>(`/api/v1/Youtube/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
  };

  refreshToken = async (): Promise<void> => {
    return searchApiClient.post('/api/v1/Youtube/refresh');
  };

  uploadVideo = async (request: YoutubeUploadRequest): Promise<YoutubeUploadResponse> => {
    return searchApiClient.post<YoutubeUploadResponse>('/api/v1/Youtube/upload', request);
  };

  getNextSlot = async (): Promise<{ nextSlot: string }> => {
    return searchApiClient.get<{ nextSlot: string }>('/api/v1/Youtube/next-slot');
  };
}

export const youtubeService = new YoutubeService();
