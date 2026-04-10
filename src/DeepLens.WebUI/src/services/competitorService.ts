import axios from 'axios';

// Ensure CORS is allowed in Orchestrator if on different port, 
// or setup proxy in vite.config.ts. For now assuming direct connect.
const API_URL = 'http://localhost:5200/api';

export interface Competitor {
    id: string;
    platform: string;
    username: string;
    displayName?: string;
    profilePicUrl?: string;
    followerCount?: number;
    followingCount?: number;
    lastScrapedAt?: string;
    isActive: boolean;
}

export interface WatchlistRequest {
    targetUsername: string;
    platform: string;
}

export const competitorService = {
    getWatchlist: async (): Promise<Competitor[]> => {
        const response = await axios.get(`${API_URL}/Competitor`);
        return response.data;
    },

    triggerScrape: async (username: string, platform: string = 'instagram') => {
        const payload = { targetUsername: username, platform };
        const response = await axios.post(`${API_URL}/Scraper/trigger`, payload);
        return response.data;
    }
};
