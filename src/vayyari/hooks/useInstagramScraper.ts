import { useState, useEffect, useCallback } from 'react';
import { instagramService, TokenHealth, SyncResult, MetaQuotaInfo } from '../services/instagram.service';
import { systemService } from '../services/system.service';

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
  const [isActive, setIsActive] = useState(true);
  const [profileCategory, setProfileCategory] = useState('Competitors');
  const [profileCategories, setProfileCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProfileCategories = useCallback(async () => {
    try {
      const data = await systemService.getProfileCategories();
      const standardCategories = [
        { id: 'MyBusiness', name: 'My Business' },
        { id: 'MyGeneral', name: 'My General' },
        { id: 'Competitors', name: 'My Competitors' },
      ];
      if (!data || data.length === 0) {
        setProfileCategories(standardCategories);
        return;
      }
      const hasCompetitors = data.some(
        c => c.id.toLowerCase() === 'competitors' || c.id.toLowerCase() === 'competitor'
      );
      if (!hasCompetitors) {
        setProfileCategories([...data, { id: 'Competitors', name: 'My Competitors' }]);
      } else {
        setProfileCategories(data);
      }
    } catch (err) {
      console.error('Failed to load profile categories', err);
      setProfileCategories([
        { id: 'MyBusiness', name: 'My Business' },
        { id: 'MyGeneral', name: 'My General' },
        { id: 'Competitors', name: 'My Competitors' },
      ]);
    }
  }, []);

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
    loadProfileCategories();
    loadTokenHealth();
    loadQuota();
    loadActiveJobs();
    const interval = setInterval(loadActiveJobs, 5000);
    return () => clearInterval(interval);
  }, [loadProfileCategories, loadTokenHealth, loadQuota, loadActiveJobs]);

  const handleRefreshToken = useCallback(async () => {
    setRefreshingToken(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await instagramService.refreshToken();
      setTokenHealth(res.health);
      setSuccessMessage('Token refreshed successfully.');
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
    setSuccessMessage(null);
    setResult(null);
    try {
      const cleanHandle = handle.replace('@', '').trim();
      const maxPosts = depthMode === 'full' ? 0 : (parseInt(depthValue) || 50);
      const data = await instagramService.syncProfile(cleanHandle, maxPosts, {
        isActive,
        profileCategory,
      });
      setQueuedJobId(data.jobId ?? null);
      setResult(null);
      setSuccessMessage(`Successfully queued @${cleanHandle} for tracking (${isActive ? 'Active' : 'Paused'}, Category: ${profileCategory}).`);
      
      // Reset form inputs for next addition
      setHandle('');
      setIsActive(true);
      setProfileCategory('Competitors');
      setDepthMode('limited');
      setDepthValue('50');

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
    successMessage,
    setSuccessMessage,
    tokenHealth,
    tokenLoading,
    refreshingToken,
    quota,
    quotaLoading,
    depthMode,
    setDepthMode,
    depthValue,
    setDepthValue,
    isActive,
    setIsActive,
    profileCategory,
    setProfileCategory,
    profileCategories,
    activeJobs,
    queuedJobId,
    handleRefreshToken,
    startSync,
  };
};
