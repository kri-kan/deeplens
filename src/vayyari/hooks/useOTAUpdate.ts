import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  checkAndApplyOTAUpdate,
  getLocalOTAVersion,
  getOTAState,
  subscribeOTAState,
  LocalOTAVersion,
  OTAProgressInfo,
} from '../services/selfHostedOTA';

export function useOTAUpdate() {
  const [otaState, setOtaState] = useState<OTAProgressInfo>(getOTAState());
  const [localVersion, setLocalVersion] = useState<LocalOTAVersion | null>(null);

  useEffect(() => {
    // Initial fetch of local version file
    getLocalOTAVersion().then((ver) => {
      setLocalVersion(ver);
    });

    // Subscribe to background progress/stage transitions
    const unsubscribe = subscribeOTAState((newState) => {
      setOtaState({ ...newState });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Trigger initial background check after 3 seconds so initial app screen paint is instant
    const timer = setTimeout(async () => {
      try {
        await checkAndApplyOTAUpdate({ silent: false });
        const refreshed = await getLocalOTAVersion();
        setLocalVersion(refreshed);
      } catch (e) {
        console.warn('[useOTAUpdate] Background update check failed:', e);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const checkForUpdates = useCallback(async (force = false) => {
    const res = await checkAndApplyOTAUpdate({ silent: false, force });
    const refreshed = await getLocalOTAVersion();
    setLocalVersion(refreshed);
    return res;
  }, []);

  return {
    ...otaState,
    localVersion,
    isChecking: otaState.stage === 'checking',
    isDownloading: otaState.stage === 'downloading',
    updateReady: otaState.stage === 'ready',
    checkForUpdates,
  };
}
