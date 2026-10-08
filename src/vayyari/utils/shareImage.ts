import { Alert, Platform } from 'react-native';
import * as ExpoSharing from 'expo-sharing';
import { cacheDirectory, createDownloadResumable } from 'expo-file-system/legacy';

/**
 * Shares an image (local file or remote URL) with other apps via Android/iOS share intent.
 */
export async function shareImageUri(uri?: string | null, title?: string): Promise<void> {
  if (!uri) {
    Alert.alert('No Image', 'No image available to share.');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: title || 'Share Image', url: uri });
          return;
        } catch {
          // Web user cancelled
          return;
        }
      }
      window.open(uri, '_blank');
      return;
    }

    let localUri = uri;

    // Remote HTTP/HTTPS image: download to local cache directory first
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const isPng = uri.toLowerCase().includes('.png');
      const ext = isPng ? 'png' : 'jpg';
      const filename = `share_${Date.now()}.${ext}`;
      const targetPath = `${cacheDirectory || ''}${filename}`;

      const downloadResumable = createDownloadResumable(uri, targetPath);
      const res = await downloadResumable.downloadAsync();
      if (!res?.uri) {
        throw new Error('Failed to download image for sharing');
      }
      localUri = res.uri;
    }

    // Ensure valid file:// protocol for Android intent
    const fileIntentUri = localUri.startsWith('file://') || localUri.startsWith('content://')
      ? localUri
      : `file://${localUri}`;

    if (await ExpoSharing.isAvailableAsync()) {
      await ExpoSharing.shareAsync(fileIntentUri, {
        mimeType: fileIntentUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        dialogTitle: title || 'Share Product Image',
      });
      return;
    }

    // Fallback to react-native-share if expo-sharing is not available
    try {
      const RNShare = require('react-native-share').default;
      await RNShare.open({
        urls: [fileIntentUri],
        title: title || 'Share Image',
        failOnCancel: false,
      });
    } catch {
      Alert.alert('Share', 'Sharing is not supported on this device.');
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('dismiss') || msg.includes('cancel') || msg.includes('User did not share')) {
      return;
    }
    console.warn('[shareImageUri] Error:', err);
    Alert.alert('Share Failed', 'Unable to share this image to other apps.');
  }
}
