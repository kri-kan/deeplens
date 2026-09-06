import { cacheDirectory, createDownloadResumable, getInfoAsync } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import { requestMediaLibraryPermission } from './device-permissions';

/**
 * Downloads media to the permanent device gallery (DCIM / Pictures / Vayyari) or browser downloads on Web.
 */
export const downloadMedia = async (
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string | undefined> => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      return filename;
    }

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    if (!cacheDirectory) throw new Error('Cache directory not available');

    const fileUri = `${cacheDirectory}${filename}`;
    const info = await getInfoAsync(fileUri);

    let localUri = fileUri;
    if (!info.exists) {
      const downloadResumable = createDownloadResumable(
        url,
        fileUri,
        {},
        (progressData) => {
          if (progressData.totalBytesExpectedToWrite > 0) {
            const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
            onProgress?.(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) throw new Error('Download failed');
      localUri = result.uri;
    }

    const asset = await MediaLibrary.createAssetAsync(localUri);

    try {
      const album = await MediaLibrary.getAlbumAsync('Vayyari');
      if (!album) {
        await MediaLibrary.createAlbumAsync('Vayyari', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch {
      // Asset created in primary gallery even if custom album grouping fails
    }

    return asset.uri;
  } catch (error) {
    console.error('[DownloadMedia] Error:', error);
    throw error;
  }
};

/**
 * Downloads media to cache and opens native share sheet with file intent.
 */
export const shareMedia = async (
  url: string,
  extension: string = 'jpg',
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    await Clipboard.setStringAsync(url);

    if (Platform.OS === 'web') {
      const filename = `share_${Date.now()}.${extension.replace(/^\./, '')}`;
      if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          const file = new File([blob], filename, {
            type: extension === 'mp4' ? 'video/mp4' : 'image/jpeg',
          });
          if ((navigator as any).canShare({ files: [file] })) {
            await (navigator as any).share({
              title: 'Vayyari Product Media',
              files: [file],
            });
            return;
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
        }
      }
      await downloadMedia(url, filename);
      Alert.alert('Media Downloaded', 'Media downloaded and URL copied to clipboard.');
      return;
    }

    if (!cacheDirectory) {
      Alert.alert('Copied', 'Media URL copied to clipboard.');
      return;
    }

    const filename = `share_${Date.now()}.${extension.replace(/^\./, '')}`;
    const fileUri = `${cacheDirectory}${filename}`;

    const downloadResumable = createDownloadResumable(
      url,
      fileUri,
      {},
      (progressData) => {
        if (progressData.totalBytesExpectedToWrite > 0) {
          const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
          onProgress?.(progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('Download for sharing failed');

    const normalizedUri = result.uri.startsWith('file://') ? result.uri : `file://${result.uri}`;

    const RNShare = require('react-native-share').default;
    await RNShare.open({
      urls: [normalizedUri],
      failOnCancel: false,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
      console.error('[ShareMedia] Error:', error);
      Alert.alert('Error', 'Failed to prepare media for sharing.');
    }
  }
};
