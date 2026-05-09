import { searchApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';

export interface SystemJob {
  id: string;
  jobName: string;
  status: 'Idle' | 'Running' | 'Paused' | 'Failed';
  lastRunAt: string;
  progressPct: number;
  metadata: any;
  updatedAt: string;
}

export const systemJobsService = {
  async getJobs(): Promise<SystemJob[]> {
    return await searchApiClient.get<SystemJob[]>(API_ROUTES.SYSTEM_JOBS.LIST);
  },

  async getOrphanedMediaCount(): Promise<number> {
    const response = await searchApiClient.get<{ count: number }>(API_ROUTES.SYSTEM_JOBS.ORPHANED_COUNT);
    return response.count;
  },

  async triggerCleanup(): Promise<number> {
    const response = await searchApiClient.post<{ orphanedProcessed: number }>(API_ROUTES.SYSTEM_JOBS.CLEANUP);
    return response.orphanedProcessed;
  }
};
