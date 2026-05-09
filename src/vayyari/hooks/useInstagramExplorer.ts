import { useState, useEffect, useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { instagramService, InstagramProfile, ScraperJob, MetaQuotaInfo, ProfileDetailsResponse } from '../services/instagram.service';
import { useAuth } from '../context/AuthContext';

export const useInstagramExplorer = () => {
  const { token } = useAuth();
  const [watchlist, setWatchlist] = useState<InstagramProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeQueue, setActiveQueue] = useState<ScraperJob[]>([]);
  const [jobHistory, setJobHistory] = useState<ScraperJob[]>([]);
  const [quota, setQuota] = useState<MetaQuotaInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI State
  const [syncMode, setSyncMode] = useState<'recent' | 'full'>('recent');
  const [targetPostCount, setTargetPostCount] = useState('12');
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'comments'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      const data = await instagramService.getWatchlist();
      setWatchlist(data);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const [active, history] = await Promise.all([
        instagramService.getActiveJobs(),
        instagramService.getJobHistory()
      ]);
      setActiveQueue(active);
      setJobHistory(history);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await instagramService.getQuota();
      setQuota(data);
    } catch (err) {
      console.error('Failed to fetch quota', err);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    fetchQuota();
  }, [fetchWatchlist, fetchQuota]);

  // fetchQueue is now handled by the queue screen

  const selectProfile = async (username: string, sBy?: string, sOrder?: string, fDate?: string | null, tDate?: string | null) => {
    setSelectedProfile(username);
    setLoading(true);
    try {
      const data = await instagramService.getProfileDetails(
        username, 
        sBy || sortBy, 
        sOrder || sortOrder, 
        fDate === undefined ? fromDate || undefined : fDate || undefined, 
        tDate === undefined ? toDate || undefined : tDate || undefined
      );
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile details', err);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (selectedProfile) {
        const data = await instagramService.getProfileDetails(
          selectedProfile, 
          sortBy, 
          sortOrder, 
          fromDate || undefined, 
          toDate || undefined
        );
        setProfileData(data);
      } else {
        await Promise.all([fetchWatchlist(), fetchQuota()]);
      }
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedProfile, sortBy, sortOrder, fromDate, toDate, fetchWatchlist, fetchQuota]);

  // Re-fetch when sort/filter params change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedProfile) {
      selectProfile(selectedProfile, sortBy, sortOrder, fromDate, toDate);
    }
  }, [sortBy, sortOrder, fromDate, toDate]);

  // Back handler removed to avoid intercepting navigation from sub-screens

  const manualSync = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const count = syncMode === 'full' ? 0 : parseInt(targetPostCount, 10);
      await instagramService.syncProfile(selectedProfile, count);
      Alert.alert("Success", syncMode === 'full' ? "Full profile sync queued." : `Sync for ${count} posts queued.`);
      fetchQueue();
    } catch (err) {
      Alert.alert("Sync Failed", "Could not complete the scraping. Check rate limits.");
    } finally {
      setLoading(false);
    }
  };

  const deleteProfileData = async () => {
    if (!selectedProfile) return;
    Alert.alert(
      "Confirm Delete",
      "This will remove all downloaded media tiles for this profile. Database records will remain but media won't show until re-scraped.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await instagramService.deleteProfileData(selectedProfile);
              Alert.alert("Success", "Media data removed.");
              selectProfile(selectedProfile);
            } catch (err) {
              Alert.alert("Error", "Failed to delete data.");
            }
          }
        }
      ]
    );
  };

  const toggleWatch = async (username: string, currentStatus: boolean) => {
    try {
      await instagramService.toggleWatchStatus(username, !currentStatus);
      await fetchWatchlist();
      if (selectedProfile === username) {
        await selectProfile(username);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const toggleOwn = async (username: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic Update for profileData if it matches the current user
    if (profileData?.profile.username === username) {
      setProfileData({
        ...profileData,
        profile: {
          ...profileData.profile,
          isOwnAccount: newStatus
        }
      });
    }

    try {
      await instagramService.toggleOwnAccount(username, newStatus);
      await fetchWatchlist();
      if (selectedProfile === username) {
        await selectProfile(username);
      }
    } catch (err) {
      // Revert optimistic update on error
      if (selectedProfile === username) {
        await selectProfile(username);
      }
      Alert.alert("Error", "Failed to update ownership status.");
    }
  };

  return {
    watchlist,
    selectedProfile,
    setSelectedProfile,
    profileData,
    setProfileData,
    loading,
    activeQueue,
    jobHistory,
    quota,
    syncMode,
    setSyncMode,
    targetPostCount,
    setTargetPostCount,
    bioExpanded,
    setBioExpanded,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    refreshing,
    handleRefresh,
    manualSync,
    deleteProfileData,
    toggleWatch,
    toggleOwn,
    fetchQueue,
    selectProfile,
  };
};
