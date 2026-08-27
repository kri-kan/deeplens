import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * useOTAUpdate
 *
 * Checks for OTA updates from the self-hosted update server whenever the app
 * comes back to the foreground. If an update is available it is downloaded and
 * applied immediately (reloads the JS bundle).
 *
 * Update server: http://krikanserver.taild227d9.ts.net/vayyari-updates/
 */
export function useOTAUpdate(): void {
  // expo-updates is a no-op in Expo Go and on web – guard both cases.
  const updatesAvailable = !__DEV__ && Platform.OS !== 'web';

  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  // When a pending update has finished downloading, reload the app to apply it.
  useEffect(() => {
    if (isUpdatePending) {
      console.log('[OTA] Update downloaded and pending – reloading now');
      Updates.reloadAsync().catch((err) => {
        console.warn('[OTA] Failed to reload after update:', err);
      });
    }
  }, [isUpdatePending]);

  // Check for updates on foreground resume.
  useEffect(() => {
    if (!updatesAvailable) {
      console.log('[OTA] Skipping update check (dev mode or web)');
      return;
    }

    const checkForUpdate = async () => {
      try {
        console.log('[OTA] Checking for update...');
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          console.log('[OTA] Update available – fetching...');
          await Updates.fetchUpdateAsync();
          // reloadAsync() will be triggered by the isUpdatePending effect above.
        } else {
          console.log('[OTA] No update available');
        }
      } catch (err) {
        console.warn('[OTA] Update check failed:', err);
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForUpdate();
      }
    };

    // Run once on mount and then on every foreground event.
    checkForUpdate();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [updatesAvailable]);

  // Log whenever expo-updates reports a new available update.
  useEffect(() => {
    if (isUpdateAvailable) {
      console.log('[OTA] expo-updates reports an update is available');
    }
  }, [isUpdateAvailable]);
}
