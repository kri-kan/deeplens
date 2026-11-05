import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AdminStorePublishBatchesPage } from '@/components/tamagui-ui/pages/AdminStorePublishBatchesPage';
import { storeAdminService, PublishJobStatusResponse } from '@/services/storeAdminService';

export default function StorePublishBatchesScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PublishJobStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await storeAdminService.getRecentPublishJobs(30);
      setJobs(data);
    } catch (err) {
      console.warn('Failed to fetch publish jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Polling when any job is running
  useEffect(() => {
    const hasRunningJob = jobs.some(
      (j) => j.status === 'in_progress' || j.status === 'queued'
    );
    if (!hasRunningJob) return;

    const interval = setInterval(() => {
      storeAdminService
        .getRecentPublishJobs(30)
        .then((updated) => setJobs(updated))
        .catch((e) => console.warn('Polling error:', e));
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  return (
    <AdminStorePublishBatchesPage
      jobs={jobs}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchJobs(true)}
      onBack={() => router.back()}
      onOpenPdp={(id) => router.push(`/product/${id}` as any)}
    />
  );
}
