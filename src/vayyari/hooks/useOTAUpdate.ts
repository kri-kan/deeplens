import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { checkAndApplyOTAUpdate, getLocalOTAVersion, LocalOTAVersion } from '../services/selfHostedOTA';

export function useOTAUpdate() {
  const [currentVersion, setCurrentVersion] = useState<LocalOTAVersion | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;
    (async () => {
      const local = await getLocalOTAVersion();
      if (isMounted) setCurrentVersion(local);

      // Delay check slightly so initial app screen paint is instant
      const timer = setTimeout(async () => {
        try {
          const res = await checkAndApplyOTAUpdate({ silent: false });
          if (isMounted && res.applied) {
            setUpdateAvailable(true);
            setNewVersion(res.newVersion || null);
          }
        } catch (e) {
          console.warn('[useOTAUpdate] Background update check failed:', e);
        }
      }, 3000);

      return () => clearTimeout(timer);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { currentVersion, updateAvailable, newVersion };
}
