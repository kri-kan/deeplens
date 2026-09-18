import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface OTAManifest {
  version: string;
  baseVersion: string;
  subversion: number;
  commitSha: string;
  targetNativeVersion: number;
  bundlePath: string;
  bundleUrl: string;
  bundleSha256?: string;
  bundleMd5?: string;
  bundleSize?: number;
  assetsPath?: string;
  assetsUrl?: string;
  publishedAt: string;
  releaseNotes?: string;
}

export interface LocalOTAVersion {
  version: string;
  baseVersion: string;
  subversion: number;
  installedAt: string;
  commitSha?: string;
}

const OTA_DIR = `${FileSystem.documentDirectory}ota/`;
const ACTIVE_DIR = `${OTA_DIR}active/`;
const STAGING_DIR = `${OTA_DIR}staging/`;
const VERSION_FILE = `${OTA_DIR}version.json`;

const CURRENT_NATIVE_VERSION = 1;
const DEFAULT_HOST = '192.168.0.170';

export async function getLocalOTAVersion(): Promise<LocalOTAVersion> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(VERSION_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(VERSION_FILE);
      return JSON.parse(content) as LocalOTAVersion;
    }
  } catch (error) {
    console.warn('[StoreOTA] Failed to read local version file:', error);
  }

  return {
    version: '1.0.0.0',
    baseVersion: '1.0.0',
    subversion: 0,
    installedAt: new Date().toISOString(),
  };
}

export async function checkAndApplyStoreOTAUpdate(options?: {
  silent?: boolean;
}): Promise<{
  updateAvailable: boolean;
  applied: boolean;
  currentVersion: string;
  newVersion?: string;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { updateAvailable: false, applied: false, currentVersion: 'web' };
  }

  try {
    const host = DEFAULT_HOST;
    const manifestUrl = `http://${host}/store-updates/manifest.json?t=${Date.now()}`;

    if (!options?.silent) {
      console.log(`[StoreOTA] Checking for updates at: ${manifestUrl}`);
    }

    const response = await fetch(manifestUrl, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      return {
        updateAvailable: false,
        applied: false,
        currentVersion: (await getLocalOTAVersion()).version,
        error: `HTTP ${response.status}`,
      };
    }

    const manifest: OTAManifest = await response.json();
    const local = await getLocalOTAVersion();

    if (manifest.targetNativeVersion > CURRENT_NATIVE_VERSION) {
      console.warn(
        `[StoreOTA] OTA bundle ${manifest.version} requires native version ${manifest.targetNativeVersion}, but APK is on ${CURRENT_NATIVE_VERSION}. Skipping OTA update.`
      );
      return {
        updateAvailable: false,
        applied: false,
        currentVersion: local.version,
        error: 'Native APK upgrade required',
      };
    }

    const isNewer =
      manifest.subversion > local.subversion ||
      (manifest.version !== local.version && manifest.subversion >= local.subversion);

    if (!isNewer) {
      if (!options?.silent) {
        console.log(`[StoreOTA] Store app is up to date (current: ${local.version})`);
      }
      return {
        updateAvailable: false,
        applied: false,
        currentVersion: local.version,
      };
    }

    console.log(`[StoreOTA] New Store OTA discovered: ${manifest.version} (current: ${local.version})`);

    const stagingInfo = await FileSystem.getInfoAsync(STAGING_DIR);
    if (stagingInfo.exists) {
      await FileSystem.deleteAsync(STAGING_DIR, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });

    const downloadUrl = manifest.bundlePath
      ? `http://${host}/store-updates/${manifest.bundlePath}`
      : manifest.bundleUrl;

    const stagedBundlePath = `${STAGING_DIR}bundle.js`;
    console.log(`[StoreOTA] Downloading Store bundle from ${downloadUrl}...`);

    const downloadResult = await FileSystem.downloadAsync(downloadUrl, stagedBundlePath);
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download Store bundle: HTTP ${downloadResult.status}`);
    }

    const downloadedInfo = await FileSystem.getInfoAsync(stagedBundlePath, { md5: true });
    if (!downloadedInfo.exists || downloadedInfo.size === 0) {
      throw new Error('Downloaded Store bundle is empty or corrupted');
    }

    if (manifest.bundleMd5 && downloadedInfo.md5 && downloadedInfo.md5 !== manifest.bundleMd5) {
      throw new Error(
        `Store bundle MD5 mismatch: expected ${manifest.bundleMd5}, got ${downloadedInfo.md5}`
      );
    }

    const activeInfo = await FileSystem.getInfoAsync(ACTIVE_DIR);
    if (activeInfo.exists) {
      await FileSystem.deleteAsync(ACTIVE_DIR, { idempotent: true });
    }
    await FileSystem.moveAsync({
      from: STAGING_DIR,
      to: ACTIVE_DIR,
    });

    const newVersionData: LocalOTAVersion = {
      version: manifest.version,
      baseVersion: manifest.baseVersion,
      subversion: manifest.subversion,
      commitSha: manifest.commitSha,
      installedAt: new Date().toISOString(),
    };
    await FileSystem.writeAsStringAsync(VERSION_FILE, JSON.stringify(newVersionData, null, 2));

    console.log(
      `[StoreOTA] ✅ Successfully applied Store OTA update ${manifest.version}. It will be loaded on next restart.`
    );

    return {
      updateAvailable: true,
      applied: true,
      currentVersion: local.version,
      newVersion: manifest.version,
    };
  } catch (err: any) {
    console.error('[StoreOTA] Error during Store OTA check/apply:', err?.message || err);
    return {
      updateAvailable: false,
      applied: false,
      currentVersion: (await getLocalOTAVersion()).version,
      error: err?.message || String(err),
    };
  }
}
