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

export type OTAStage = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface OTAProgressInfo {
  stage: OTAStage;
  percent: number; // 0 to 100
  bytesDownloaded: number;
  totalBytes: number;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
  error?: string;
  workingHost?: string;
}

export type OTABootStatus = 'pending_validation' | 'stable' | 'failed' | 'crashed_reverted';

export interface OTAStatusRecord {
  version: string;
  status: OTABootStatus;
  bootAttempts: number;
  updatedAt: string;
  error?: string;
}

/**
 * Strictly limits OTA operations to native Android and iOS environments.
 * Web, PWAs, desktop environments return false.
 */
export function isNativeOTAEligible(platform?: string): boolean {
  return platform === 'android' || platform === 'ios';
}

/**
 * Validates integrity of a downloaded bundle prior to promoting it to active.
 */
export function validateBundleIntegrity(
  fileInfo: { exists: boolean; size?: number; md5?: string },
  manifest: { bundleSize?: number; bundleMd5?: string }
): { valid: boolean; reason?: string } {
  if (!fileInfo.exists) {
    return { valid: false, reason: 'Downloaded bundle file does not exist on disk' };
  }
  if (!fileInfo.size || fileInfo.size === 0) {
    return { valid: false, reason: 'Downloaded bundle is 0 bytes / empty' };
  }
  if (manifest.bundleMd5 && fileInfo.md5 && fileInfo.md5.toLowerCase() !== manifest.bundleMd5.toLowerCase()) {
    return {
      valid: false,
      reason: `MD5 mismatch: expected ${manifest.bundleMd5}, got ${fileInfo.md5}`,
    };
  }
  return { valid: true };
}

/**
 * Builds candidate hosts for checking OTA updates across LAN, Tailscale, and public DNS.
 */
export function buildCandidateHosts(baseHost?: string): string[] {
  const hosts: string[] = [];
  if (baseHost) hosts.push(baseHost);
  hosts.push('adminapi.vayyarifashions.com');
  hosts.push('192.168.0.170');
  hosts.push('100.98.244.8');
  return Array.from(new Set(hosts.filter(Boolean)));
}

/**
 * Clamps download progress accurately between 0 and 100%.
 */
export function calculateDownloadProgress(bytesWritten: number, totalExpected: number): number {
  if (totalExpected <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((bytesWritten / totalExpected) * 100)));
}

/**
 * Determines whether the remote manifest represents a newer bundle than the active version.
 */
export function isUpdateNewer(
  remote: { version: string; subversion: number },
  local: { version: string; subversion: number },
  force = false
): boolean {
  if (force) return true;
  return (
    remote.subversion > local.subversion ||
    (remote.version !== local.version && remote.subversion >= local.subversion)
  );
}

/**
 * Reactive state container and observer for OTA update lifecycles.
 */
export class OTAStateManager {
  private state: OTAProgressInfo;
  private listeners: Set<OTAListener> = new Set();

  constructor(initialVersion = '1.0.0.0') {
    this.state = {
      stage: 'idle',
      percent: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      currentVersion: initialVersion,
    };
  }

  getState(): OTAProgressInfo {
    return this.state;
  }

  subscribe(listener: OTAListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(partial: Partial<OTAProgressInfo>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (e) {
        console.warn('[OTAStateManager] Listener error:', e);
      }
    });
  }
}

export const defaultOTAStateManager = new OTAStateManager('1.0.0.0');
