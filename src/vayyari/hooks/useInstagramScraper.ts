import { useState, useEffect, useCallback } from 'react';
import { instagramService, TokenHealth, SyncResult, MetaQuotaInfo } from '../services/instagram.service';

export const useInstagramScraper = () => {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenHealth, setTokenHealth] = useState<TokenHealth | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [quota, setQuota] = useState<MetaQuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [depthMode, setDepthMode] = useState<'full' | 'limited'>('limited');
  const [depthValue, setDepthValue] = useState('50');
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);

  const loadActiveJobs = useCallback(async () => {
    try {
      const data = await instagramService.getActiveJobs();
      setActiveJobs(data.filter((j: any) => j.jobType === 'manual'));
    } catch (error) {
      console.error("Failed to load active jobs", error);
    }
  }, []);

  const loadTokenHealth = useCallback(async () => {
    setTokenLoading(true);
    try {
      const health = await instagramService.getTokenHealth();
      setTokenHealth(health);
    } catch {
      // Token health fetch failure is non-critical
    } finally {
      setTokenLoading(false);
    }
  }, []);

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    try {
      const data = await instagramService.getQuota();
      setQuota(data);
    } catch {
      // non-critical
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokenHealth();
    loadQuota();
    loadActiveJobs();
    const interval = setInterval(loadActiveJobs, 5000);
    return () => clearInterval(interval);
  }, [loadTokenHealth, loadQuota, loadActiveJobs]);

  const handleRefreshToken = useCallback(async () => {
    setRefreshingToken(true);
    setError(null);
    try {
      const res = await instagramService.refreshToken();
      setTokenHealth(res.health);
    } catch (err: any) {
      setError(err.message || 'Token refresh failed');
    } finally {
      setRefreshingToken(false);
    }
  }, []);

  const startSync = async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const maxPosts = depthMode === 'full' ? 0 : (parseInt(depthValue) || 50);
      const data = await instagramService.syncProfile(handle.replace('@', '').trim(), maxPosts);
      setQueuedJobId(data.jobId ?? null);
      setResult(null);
      loadActiveJobs();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Sync failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    handle,
    setHandle,
    loading,
    result,
    setResult,
    error,
    setError,
    tokenHealth,
    tokenLoading,
    refreshingToken,
    quota,
    quotaLoading,
    depthMode,
    setDepthMode,
    depthValue,
    setDepthValue,
    activeJobs,
    queuedJobId,
    handleRefreshToken,
    startSync,
  };
};
