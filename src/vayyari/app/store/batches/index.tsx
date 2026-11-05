import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { AdminStorePublishBatchesPage } from '@/components/tamagui-ui/pages/AdminStorePublishBatchesPage';
import { storeAdminService, PublishJobStatusResponse } from '@/services/storeAdminService';

const PAGE_SIZE = 20;

export default function StorePublishBatchesListScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PublishJobStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Keep ref to avoid stale closures in callbacks
  const jobsCountRef = useRef(0);
  jobsCountRef.current = jobs.length;

  const fetchJobs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await storeAdminService.getRecentPublishJobs(PAGE_SIZE, 0);
      setJobs(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.warn('Failed to fetch publish jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || refreshing || loading || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const currentOffset = jobsCountRef.current;
      const nextBatch = await storeAdminService.getRecentPublishJobs(PAGE_SIZE, currentOffset);

      if (nextBatch.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (nextBatch.length > 0) {
        setJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const fresh = nextBatch.filter((j) => !existingIds.has(j.id));
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      console.warn('Failed to load more publish jobs:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loading, refreshing]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Polling when any loaded job is still running/queued
  useEffect(() => {
    const hasRunningJob = jobs.some(
      (j) => j.status === 'in_progress' || j.status === 'queued'
    );
    if (!hasRunningJob) return;

    const interval = setInterval(async () => {
      try {
        const latest = await storeAdminService.getRecentPublishJobs(PAGE_SIZE, 0);
        setJobs((prev) => {
          const latestMap = new Map(latest.map((j) => [j.id, j]));
          return prev.map((old) => latestMap.get(old.id) || old);
        });
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  return (
    <AdminStorePublishBatchesPage
      jobs={jobs}
      loading={loading}
      refreshing={refreshing}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onRefresh={() => fetchJobs(true)}
      onLoadMore={handleLoadMore}
      onBack={() => router.back()}
      onSelectBatch={(job) => router.push(`/store/batches/${job.id}` as any)}
      onOpenPdp={(id) => router.push(`/product/${id}` as any)}
    />
  );
}
