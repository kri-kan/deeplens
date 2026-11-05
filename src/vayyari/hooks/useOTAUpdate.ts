import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  checkAndApplyOTAUpdate,
  getLocalOTAVersion,
  getOTAState,
  subscribeOTAState,
  markOTABundleHealthy,
  isNativeOTAEligible,
  LocalOTAVersion,
  OTAProgressInfo,
} from '../services/selfHostedOTA';

export function useOTAUpdate() {
  const isNative = isNativeOTAEligible(Platform.OS);
  const [otaState, setOtaState] = useState<OTAProgressInfo>(
    isNative
      ? getOTAState()
      : {
          stage: 'idle',
          percent: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          currentVersion: 'web',
        }
  );
  const [localVersion, setLocalVersion] = useState<LocalOTAVersion | null>(
    isNative
      ? null
      : {
          version: 'web',
          baseVersion: 'web',
          subversion: 0,
          installedAt: '',
        }
  );

  useEffect(() => {
    if (!isNative) return;

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
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    // Trigger initial background silent check after 3 seconds so initial app screen paint is instant
    const updateTimer = setTimeout(async () => {
      try {
        await checkAndApplyOTAUpdate({ silent: true });
        const refreshed = await getLocalOTAVersion();
        setLocalVersion(refreshed);
      } catch (e) {
        console.warn('[useOTAUpdate] Background update check failed:', e);
      }
    }, 3000);

    // After 5 seconds of stable execution, mark the current active bundle healthy (protecting against crash-loops)
    const healthTimer = setTimeout(async () => {
      try {
        await markOTABundleHealthy();
      } catch (e) {
        console.warn('[useOTAUpdate] Failed to mark bundle healthy:', e);
      }
    }, 5000);

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(healthTimer);
    };
  }, [isNative]);

  const checkForUpdates = useCallback(
    async (force = false) => {
      if (!isNative) {
        return { updateAvailable: false, applied: false, currentVersion: 'web' };
      }
      const res = await checkAndApplyOTAUpdate({ silent: false, force });
      const refreshed = await getLocalOTAVersion();
      setLocalVersion(refreshed);
      return res;
    },
    [isNative]
  );

  return {
    ...otaState,
    isNative,
    localVersion,
    isChecking: otaState.stage === 'checking',
    isDownloading: otaState.stage === 'downloading',
    updateReady: otaState.stage === 'ready',
    checkForUpdates,
  };
}
