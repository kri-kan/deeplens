import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiBaseHost } from '../utils/api-config';
import {
  OTAManifest,
  LocalOTAVersion,
  OTAStage,
  OTAProgressInfo,
  OTAListener,
  OTAStatusRecord,
  buildCandidateHosts,
  calculateDownloadProgress,
  isUpdateNewer,
  isNativeOTAEligible,
  validateBundleIntegrity,
  createPendingStatusRecord,
  markStatusRecordHealthy,
  shouldPurgeAndRevert,
  defaultOTAStateManager,
} from '../utils/otaUtils';

export {
  OTAManifest,
  LocalOTAVersion,
  OTAStage,
  OTAProgressInfo,
  OTAListener,
  OTAStatusRecord,
  buildCandidateHosts,
  calculateDownloadProgress,
  isUpdateNewer,
  isNativeOTAEligible,
  validateBundleIntegrity,
};

const getOtaDir = () => `${FileSystem.documentDirectory || ''}ota/`;
const getActiveDir = () => `${getOtaDir()}active/`;
const getStagingDir = () => `${getOtaDir()}staging/`;
const getBackupDir = () => `${getOtaDir()}backup/`;
const getVersionFile = () => `${getOtaDir()}version.json`;
const getStatusFile = () => `${getOtaDir()}status.json`;

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
  if (!isNativeOTAEligible(Platform.OS)) {
    return {
      version: 'web',
      baseVersion: 'web',
      subversion: 0,
      installedAt: '',
    };
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(getVersionFile());
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(getVersionFile());
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
    const stagingDir = getStagingDir();
    const stagingInfo = await FileSystem.getInfoAsync(stagingDir);
    if (stagingInfo.exists) {
      await FileSystem.deleteAsync(stagingDir, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true });

    // Download bundle into staging
    const downloadUrl = manifest.bundlePath
      ? `http://${workingHost}/admin-updates/${manifest.bundlePath}`
      : manifest.bundleUrl;

    const stagedBundlePath = `${stagingDir}bundle.js`;
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
    const integrity = validateBundleIntegrity(downloadedInfo, manifest);
    if (!integrity.valid) {
      throw new Error(`Bundle validation failed: ${integrity.reason}`);
    }

    // Atomically promote staging to active with safety backup
    const activeDir = getActiveDir();
    const backupDir = getBackupDir();

    // 1. If old backup exists, clear it
    const backupInfo = await FileSystem.getInfoAsync(backupDir);
    if (backupInfo.exists) {
      await FileSystem.deleteAsync(backupDir, { idempotent: true });
    }

    // 2. Move existing active to backup (protecting current working code)
    const activeInfo = await FileSystem.getInfoAsync(activeDir);
    if (activeInfo.exists) {
      await FileSystem.moveAsync({
        from: activeDir,
        to: backupDir,
      });
    }

    try {
      // 3. Move newly staged bundle to active
      await FileSystem.moveAsync({
        from: stagingDir,
        to: activeDir,
      });

      // 4. Mark status.json with pending_validation
      const pendingStatus = createPendingStatusRecord(manifest.version);
      await FileSystem.writeAsStringAsync(getStatusFile(), JSON.stringify(pendingStatus, null, 2));

      // 5. Successful promotion - safely remove backup
      const postBackupInfo = await FileSystem.getInfoAsync(backupDir);
      if (postBackupInfo.exists) {
        await FileSystem.deleteAsync(backupDir, { idempotent: true });
      }
    } catch (moveErr) {
      console.error('[SelfHostedOTA] Promotion error, attempting restore from backup:', moveErr);
      const postBackupInfo = await FileSystem.getInfoAsync(backupDir);
      if (postBackupInfo.exists) {
        await FileSystem.moveAsync({ from: backupDir, to: activeDir });
      }
      throw moveErr;
    }

    // Write new local version file
    const newVersionData: LocalOTAVersion = {
      version: manifest.version,
      baseVersion: manifest.baseVersion,
      subversion: manifest.subversion,
      commitSha: manifest.commitSha,
      installedAt: new Date().toISOString(),
    };
    await FileSystem.writeAsStringAsync(getVersionFile(), JSON.stringify(newVersionData, null, 2));

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

/**
 * Confirms that the newly loaded OTA bundle booted stably without crashing.
 * Marks the status record as 'stable' and resets boot attempts to 0.
 */
export async function markOTABundleHealthy(): Promise<void> {
  if (!isNativeOTAEligible(Platform.OS)) return;
  try {
    const statusFile = getStatusFile();
    const info = await FileSystem.getInfoAsync(statusFile);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(statusFile);
      const parsed = JSON.parse(content) as OTAStatusRecord;
      if (parsed && parsed.status === 'pending_validation') {
        const healthy = markStatusRecordHealthy(parsed);
        await FileSystem.writeAsStringAsync(statusFile, JSON.stringify(healthy, null, 2));
        console.log(`[SelfHostedOTA] 🛡️ Marked OTA bundle v${healthy.version} as STABLE and HEALTHY.`);
      }
    }
  } catch (err) {
    console.warn('[SelfHostedOTA] Failed to mark OTA bundle healthy:', err);
  }
}

/**
 * Retrieves the current boot/rollout health status of the active bundle.
 */
export async function getOTABundleStatus(): Promise<OTAStatusRecord | null> {
  if (!isNativeOTAEligible(Platform.OS)) return null;
  try {
    const statusFile = getStatusFile();
    const info = await FileSystem.getInfoAsync(statusFile);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(statusFile);
      return JSON.parse(content) as OTAStatusRecord;
    }
  } catch (err) {
    console.warn('[SelfHostedOTA] Failed to read OTA bundle status:', err);
  }
  return null;
}

