import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { instagramService, InstagramProfile, ScraperJob, MetaQuotaInfo, ProfileDetailsResponse } from '../services/instagram.service';
import { systemService } from '../services/system.service';
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
  const [profileCategories, setProfileCategories] = useState<{id: string, name: string}[]>([]);
  
  // Pagination State
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
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
    } catch (error) {
      console.error('Failed to fetch watchlist', error);
    }
  }, []);

  const fetchProfileCategories = useCallback(async () => {
    try {
      const data = await systemService.getProfileCategories();
      setProfileCategories(data);
    } catch (error) {
      console.error('Failed to fetch profile categories', error);
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
    } catch (error) {
      console.error('Failed to fetch queue', error);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await instagramService.getQuota();
      setQuota(data);
    } catch (error) {
      console.error('Failed to fetch quota', error);
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchWatchlist(),
      fetchQueue(),
      fetchQuota(),
      fetchProfileCategories()
    ]);
    setLoading(false);
  }, [fetchWatchlist, fetchQueue, fetchQuota, fetchProfileCategories]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  // fetchQueue is now handled by the queue screen

  const selectProfile = async (username: string, sBy?: string, sOrder?: string, fDate?: string | null, tDate?: string | null) => {
    setSelectedProfile(username);
    setLoading(true);
    offsetRef.current = 0;
    loadingMoreRef.current = false;
    setHasMore(true);
    try {
      const data = await instagramService.getProfileDetails(
        username, 
        sBy || sortBy, 
        sOrder || sortOrder, 
        fDate === undefined ? fromDate || undefined : fDate || undefined, 
        tDate === undefined ? toDate || undefined : tDate || undefined,
        100,
        0
      );
      setProfileData(data);
      offsetRef.current = data.videos.length;
      setHasMore(data.videos.length === 100);
    } catch (error) {
      console.error('Failed to fetch profile details', error);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    loadingMoreRef.current = false;
    setHasMore(true);
    try {
      if (selectedProfile) {
        const data = await instagramService.getProfileDetails(
          selectedProfile, 
          sortBy, 
          sortOrder, 
          fromDate || undefined, 
          toDate || undefined,
          100,
          0
        );
        setProfileData(data);
        offsetRef.current = data.videos.length;
        setHasMore(data.videos.length === 100);
      } else {
        await Promise.all([fetchWatchlist(), fetchQuota()]);
      }
    } catch (error) {
      console.error('Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedProfile, sortBy, sortOrder, fromDate, toDate, fetchWatchlist, fetchQuota]);

  // Re-fetch when sort/filter params change
   
  useEffect(() => {
    if (selectedProfile) {
      selectProfile(selectedProfile, sortBy, sortOrder, fromDate, toDate);
    }
  }, [sortBy, sortOrder, fromDate, toDate]);

  const loadMorePosts = async () => {
    if (!selectedProfile || !hasMore || loadingMoreRef.current || loading || refreshing) return;
    
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await instagramService.getProfileDetails(
        selectedProfile,
        sortBy,
        sortOrder,
        fromDate || undefined,
        toDate || undefined,
        100,
        offsetRef.current
      );
      
      setProfileData(prev => {
        if (!prev) return data;
        
        // Filter out any duplicates just in case
        const existingIds = new Set(prev.videos.map(v => v.id));
        const newVideos = data.videos.filter(v => !existingIds.has(v.id));
        
        return {
          ...prev,
          videos: [...prev.videos, ...newVideos]
        };
      });
      offsetRef.current += data.videos.length;
      setHasMore(data.videos.length === 100);
    } catch (error) {
      console.error('Failed to load more posts', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  // Back handler removed to avoid intercepting navigation from sub-screens

  const manualSync = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const count = syncMode === 'full' ? 0 : parseInt(targetPostCount, 10);
      await instagramService.syncProfile(selectedProfile, count);
      Alert.alert("Success", syncMode === 'full' ? "Full profile sync queued." : `Sync for ${count} posts queued.`);
      fetchQueue();
    } catch {
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
            } catch {
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
    } catch {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const setCategory = async (username: string, newCategory: string) => {
    // Optimistic Update for profileData if it matches the current user
    if (profileData?.profile.username === username) {
      setProfileData({
        ...profileData,
        profile: {
          ...profileData.profile,
          profileCategory: newCategory
        }
      });
    }

    try {
      await instagramService.setProfileCategory(username, newCategory);
      await fetchWatchlist();
      if (selectedProfile === username) {
        await selectProfile(username);
      }
    } catch {
      // Revert optimistic update on error
      if (selectedProfile === username) {
        await selectProfile(username);
      }
      Alert.alert("Error", "Failed to update profile category.");
    }
  };

  const togglePin = async (username: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic Update for watchlist sorting and status
    setWatchlist(prev => {
      const updated = prev.map(p => p.username === username ? { ...p, isPinned: newStatus } : p);
      // Re-sort: isPinned first, then profileCategory, then alphabetical
      return updated.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.profileCategory !== b.profileCategory) return a.profileCategory.localeCompare(b.profileCategory);
        return a.username.localeCompare(b.username);
      });
    });

    try {
      await instagramService.togglePinStatus(username, newStatus);
    } catch {
      // Revert on error by fetching
      await fetchWatchlist();
      Alert.alert("Error", "Failed to update pin status.");
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
    setCategory,
    togglePin,
    fetchQueue,
    selectProfile,
    loadMorePosts,
    hasMore,
    loadingMore,
    profileCategories,
  };
};
