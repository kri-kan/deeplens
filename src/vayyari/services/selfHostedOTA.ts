import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiBaseHost } from '../utils/api-config';
import {
  OTAManifest,
  LocalOTAVersion,
  OTAStage,
  OTAProgressInfo,
  OTAListener,
  buildCandidateHosts,
  calculateDownloadProgress,
  isUpdateNewer,
  defaultOTAStateManager,
} from '../utils/otaUtils';

export {
  OTAManifest,
  LocalOTAVersion,
  OTAStage,
  OTAProgressInfo,
  OTAListener,
  buildCandidateHosts,
  calculateDownloadProgress,
  isUpdateNewer,
};

const OTA_DIR = `${FileSystem.documentDirectory}ota/`;
const ACTIVE_DIR = `${OTA_DIR}active/`;
const STAGING_DIR = `${OTA_DIR}staging/`;
const VERSION_FILE = `${OTA_DIR}version.json`;

// Native binary version of this APK (increments only when native code/modules change)
const CURRENT_NATIVE_VERSION = 1;

let isCheckingOrDownloading = false;

export function getOTAState(): OTAProgressInfo {
  return defaultOTAStateManager.getState();
}

export function subscribeOTAState(listener: OTAListener): () => void {
  return defaultOTAStateManager.subscribe(listener);
}

/**
 * Candidate hosts for checking OTA updates across LAN, Tailscale, and public DNS.
 */
export function getCandidateHosts(): string[] {
  return buildCandidateHosts(getApiBaseHost());
}

/**
 * Reads the currently active OTA version from local storage.
 * Falls back to base 1.0.0.0 if running the bundled APK asset.
 */
export async function getLocalOTAVersion(): Promise<LocalOTAVersion> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(VERSION_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(VERSION_FILE);
      const parsed = JSON.parse(content) as LocalOTAVersion;
      if (parsed?.version && defaultOTAStateManager.getState().currentVersion === '1.0.0.0') {
        defaultOTAStateManager.update({ currentVersion: parsed.version });
      }
      return parsed;
    }
  } catch (error) {
    console.warn('[SelfHostedOTA] Failed to read local version file:', error);
  }

  return {
    version: '1.0.0.0',
    baseVersion: '1.0.0',
    subversion: 0,
    installedAt: new Date().toISOString(),
  };
}

/**
 * Probes candidate hosts sequentially to fetch the active OTA manifest.
 */
async function fetchManifestWithFallback(): Promise<{ manifest: OTAManifest; workingHost: string }> {
  const hosts = getCandidateHosts();
  let lastError: any = null;

  for (const host of hosts) {
    const manifestUrl = `http://${host}/admin-updates/manifest.json?t=${Date.now()}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(manifestUrl, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const manifest: OTAManifest = await res.json();
        return { manifest, workingHost: host };
      } else {
        lastError = new Error(`HTTP ${res.status} from ${host}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate hosts failed to return manifest');
}

/**
 * Checks for a newer OTA bundle on the server and applies it to ota/active/.
 * Emits reactive progress updates via subscribeOTAState.
 */
export async function checkAndApplyOTAUpdate(options?: {
  silent?: boolean;
  force?: boolean;
}): Promise<{
  updateAvailable: boolean;
  applied: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { updateAvailable: false, applied: false, currentVersion: 'web' };
  }

  const currentState = defaultOTAStateManager.getState();
  if (isCheckingOrDownloading) {
    return {
      updateAvailable: currentState.stage === 'ready' || currentState.stage === 'downloading',
      applied: currentState.stage === 'ready',
      currentVersion: currentState.currentVersion,
      newVersion: currentState.newVersion,
    };
  }

  isCheckingOrDownloading = true;
  const local = await getLocalOTAVersion();
  defaultOTAStateManager.update({
    stage: 'checking',
    currentVersion: local.version,
    error: undefined,
  });

  try {
    const { manifest, workingHost } = await fetchManifestWithFallback();

    if (!options?.silent) {
      console.log(`[SelfHostedOTA] Connected to ${workingHost}, server manifest version: ${manifest.version}`);
    }

    // Guardrail: Do not apply OTA bundle if it requires a newer native APK
    if (manifest.targetNativeVersion > CURRENT_NATIVE_VERSION) {
      console.warn(
        `[SelfHostedOTA] OTA bundle ${manifest.version} requires native version ${manifest.targetNativeVersion}, but APK is on ${CURRENT_NATIVE_VERSION}. Skipping OTA update (APK reinstall required).`
      );
      defaultOTAStateManager.update({ stage: 'idle', currentVersion: local.version });
      return {
        updateAvailable: false,
        applied: false,
        currentVersion: local.version,
        error: 'Native APK upgrade required',
      };
    }

    const newer = isUpdateNewer(manifest, local, options?.force);

    if (!newer) {
      if (!options?.silent) {
        console.log(`[SelfHostedOTA] App is up to date (current: ${local.version})`);
      }
      defaultOTAStateManager.update({ stage: 'idle', currentVersion: local.version, workingHost });
      return {
        updateAvailable: false,
        applied: false,
        currentVersion: local.version,
      };
    }

    console.log(
      `[SelfHostedOTA] New OTA update discovered: ${manifest.version} (current: ${local.version})`
    );

    defaultOTAStateManager.update({
      stage: 'downloading',
      percent: 0,
      bytesDownloaded: 0,
      totalBytes: manifest.bundleSize || 0,
      currentVersion: local.version,
      newVersion: manifest.version,
      releaseNotes: manifest.releaseNotes,
      workingHost,
    });

    // Prepare staging directory
    const stagingInfo = await FileSystem.getInfoAsync(STAGING_DIR);
    if (stagingInfo.exists) {
      await FileSystem.deleteAsync(STAGING_DIR, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });

    // Download bundle into staging
    const downloadUrl = manifest.bundlePath
      ? `http://${workingHost}/admin-updates/${manifest.bundlePath}`
      : manifest.bundleUrl;

    const stagedBundlePath = `${STAGING_DIR}bundle.js`;
    console.log(`[SelfHostedOTA] Downloading bundle from ${downloadUrl}...`);

    let downloadSucceeded = false;
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        stagedBundlePath,
        {},
        (progress) => {
          const total = progress.totalBytesExpectedToWrite > 0
            ? progress.totalBytesExpectedToWrite
            : (manifest.bundleSize || 0);
          const percent = calculateDownloadProgress(progress.totalBytesWritten, total);

          defaultOTAStateManager.update({
            stage: 'downloading',
            percent,
            bytesDownloaded: progress.totalBytesWritten,
            totalBytes: total,
            currentVersion: local.version,
            newVersion: manifest.version,
            releaseNotes: manifest.releaseNotes,
          });
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (downloadResult && downloadResult.status === 200) {
        downloadSucceeded = true;
      }
    } catch (resumableErr) {
      console.warn('[SelfHostedOTA] createDownloadResumable failed, falling back to downloadAsync:', resumableErr);
      const directResult = await FileSystem.downloadAsync(downloadUrl, stagedBundlePath);
      if (directResult.status === 200) {
        downloadSucceeded = true;
      }
    }

    if (!downloadSucceeded) {
      throw new Error('Failed to download bundle from server');
    }

    // Verify downloaded bundle integrity
    const downloadedInfo = await FileSystem.getInfoAsync(stagedBundlePath, { md5: true });
    if (!downloadedInfo.exists || downloadedInfo.size === 0) {
      throw new Error('Downloaded bundle is empty or corrupted');
    }

    if (manifest.bundleMd5 && downloadedInfo.md5 && downloadedInfo.md5 !== manifest.bundleMd5) {
      throw new Error(
        `Bundle MD5 mismatch: expected ${manifest.bundleMd5}, got ${downloadedInfo.md5}`
      );
    }

    // Atomically promote staging to active
    const activeInfo = await FileSystem.getInfoAsync(ACTIVE_DIR);
    if (activeInfo.exists) {
      await FileSystem.deleteAsync(ACTIVE_DIR, { idempotent: true });
    }
    await FileSystem.moveAsync({
      from: STAGING_DIR,
      to: ACTIVE_DIR,
    });

    // Write new local version file
    const newVersionData: LocalOTAVersion = {
      version: manifest.version,
      baseVersion: manifest.baseVersion,
      subversion: manifest.subversion,
      commitSha: manifest.commitSha,
      installedAt: new Date().toISOString(),
    };
    await FileSystem.writeAsStringAsync(VERSION_FILE, JSON.stringify(newVersionData, null, 2));

    console.log(
      `[SelfHostedOTA] ✅ Successfully applied OTA update ${manifest.version}. It will be loaded on next restart.`
    );

    defaultOTAStateManager.update({
      stage: 'ready',
      percent: 100,
      currentVersion: local.version,
      newVersion: manifest.version,
      releaseNotes: manifest.releaseNotes,
      workingHost,
    });

    return {
      updateAvailable: true,
      applied: true,
      currentVersion: local.version,
      newVersion: manifest.version,
      releaseNotes: manifest.releaseNotes,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[SelfHostedOTA] Error during OTA update check/apply:', errorMsg);
    defaultOTAStateManager.update({
      stage: 'error',
      error: errorMsg,
      currentVersion: local.version,
    });
    return {
      updateAvailable: false,
      applied: false,
      currentVersion: local.version,
      error: errorMsg,
    };
  } finally {
    isCheckingOrDownloading = false;
  }
}
