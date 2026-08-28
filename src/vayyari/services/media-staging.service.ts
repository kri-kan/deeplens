import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface StagedMediaItem {
  uri: string;
  type?: 'image' | 'video';
  fileName?: string;
  mimeType?: string;
  sessionId?: string;
}

class MediaStagingService {
  private getBaseStagingDir(): string {
    const base = FileSystem.cacheDirectory || '';
    return `${base}staged_share/`;
  }

  private getSessionDir(sessionId: string): string {
    return `${this.getBaseStagingDir()}${sessionId}/`;
  }

  /**
   * Stages an array of URIs (e.g. from picker or external source) into a local staging session folder.
   */
  async stageMedia(uris: string[], sessionId?: string): Promise<{ sessionId: string; stagedUris: string[] }> {
    const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sessionDir = this.getSessionDir(sid);

    if (Platform.OS !== 'web') {
      const dirInfo = await FileSystem.getInfoAsync(sessionDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });
      }
    }

    const stagedUris: string[] = [];

    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      if (uri.startsWith(sessionDir)) {
        stagedUris.push(uri);
        continue;
      }

      if (Platform.OS === 'web') {
        stagedUris.push(uri);
        continue;
      }

      try {
        const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const targetPath = `${sessionDir}media_${i}_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });
        stagedUris.push(targetPath);
      } catch (err) {
        console.warn(`[MediaStagingService] Failed to copy URI ${uri} to staging dir:`, err);
        stagedUris.push(uri);
      }
    }

    return { sessionId: sid, stagedUris };
  }

  /**
   * Purges all local cached files for a specific session ID.
   */
  async purgeSession(sessionId: string): Promise<void> {
    if (!sessionId || Platform.OS === 'web') return;
    try {
      const sessionDir = this.getSessionDir(sessionId);
      const dirInfo = await FileSystem.getInfoAsync(sessionDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(sessionDir, { idempotent: true });
        console.log(`[MediaStagingService] Purged staged session ${sessionId}`);
      }
    } catch (err) {
      console.error(`[MediaStagingService] Error purging session ${sessionId}:`, err);
    }
  }

  /**
   * Removes old staging directories that may be orphaned.
   */
  async cleanupOldStaging(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const baseDir = this.getBaseStagingDir();
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) return;

      const subDirs = await FileSystem.readDirectoryAsync(baseDir);
      for (const dirName of subDirs) {
        const fullPath = `${baseDir}${dirName}/`;
        const info = await FileSystem.getInfoAsync(fullPath);
        if (info.exists && info.modificationTime) {
          // If older than 24 hours (86400 seconds)
          const ageSeconds = (Date.now() / 1000) - info.modificationTime;
          if (ageSeconds > 86400) {
            await FileSystem.deleteAsync(fullPath, { idempotent: true });
            console.log(`[MediaStagingService] Cleaned up expired staging dir: ${dirName}`);
          }
        }
      }
    } catch (err) {
      console.warn('[MediaStagingService] Staging cleanup warning:', err);
    }
  }

  /**
   * Called after successfully committing (e.g. order created or product created) to clean up local staging files.
   */
  async commitSession(sessionId: string): Promise<void> {
    await this.purgeSession(sessionId);
  }
}

export const mediaStagingService = new MediaStagingService();
