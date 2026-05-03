import { useState, useEffect, useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { instagramService } from '../services/instagram.service';
import { useAuth } from '../context/AuthContext';

export const useInstagramExplorer = () => {
  const { token } = useAuth();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [quota, setQuota] = useState<any | null>(null);
  
  // UI State
  const [showQueue, setShowQueue] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showQueueHistory, setShowQueueHistory] = useState(false);
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

  useEffect(() => {
    if (showQueue) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [showQueue, fetchQueue]);

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

  useEffect(() => {
    if (selectedProfile) {
      selectProfile(selectedProfile, sortBy, sortOrder, fromDate, toDate);
    }
  }, [sortBy, sortOrder, fromDate, toDate]);

  useEffect(() => {
    const backAction = () => {
      if (selectedProfile) {
        setSelectedProfile(null);
        setProfileData(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [selectedProfile]);

  const manualSync = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const count = syncMode === 'full' ? 0 : parseInt(targetPostCount, 10);
      await instagramService.syncProfile(selectedProfile, count);
      Alert.alert("Success", syncMode === 'full' ? "Full profile sync queued." : `Sync for ${count} posts queued.`);
      setShowConfig(false);
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
      fetchWatchlist();
      if (selectedProfile === username) {
        selectProfile(username);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const toggleOwn = async (username: string, currentStatus: boolean) => {
    try {
      await instagramService.toggleOwnAccount(username, !currentStatus);
      fetchWatchlist();
      if (selectedProfile === username) {
        selectProfile(username);
      }
    } catch (err) {
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
    showQueue,
    setShowQueue,
    showConfig,
    setShowConfig,
    showQueueHistory,
    setShowQueueHistory,
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
    manualSync,
    deleteProfileData,
    toggleWatch,
    toggleOwn,
    fetchQueue,
    selectProfile,
  };
};
