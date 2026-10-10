import { Alert, Platform, Linking } from 'react-native';
import * as ExpoSharing from 'expo-sharing';
import { cacheDirectory, createDownloadResumable } from 'expo-file-system/legacy';

/**
 * Shares an image or PDF (local file or remote URL) with other apps via Android/iOS share intent.
 * Note: ExpoSharing.shareAsync requires a file:// URI on Android.
 */
export async function shareImageUri(uri?: string | null, title?: string): Promise<void> {
  if (!uri) {
    Alert.alert('No File', 'No file available to share.');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: title || 'Share File', url: uri });
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

    // Remote HTTP/HTTPS file: download to local cache directory first
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const lower = uri.toLowerCase();
      const isPdf = lower.includes('.pdf');
      const isPng = lower.includes('.png');
      const ext = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';
      const filename = `share_${Date.now()}.${ext}`;
      const targetPath = `${cacheDirectory || ''}${filename}`;

      const downloadResumable = createDownloadResumable(uri, targetPath);
      const res = await downloadResumable.downloadAsync();
      if (!res?.uri) {
        throw new Error('Failed to download file for sharing');
      }
      localUri = res.uri;
    }

    // ExpoSharing strictly requires a file:// URI
    const fileIntentUri = localUri.startsWith('file://')
      ? localUri
      : `file://${localUri.replace(/^[^/]+:\/\//, '')}`;

    const isPdfFile = fileIntentUri.toLowerCase().endsWith('.pdf');
    const isPngFile = fileIntentUri.toLowerCase().endsWith('.png');
    const mimeType = isPdfFile ? 'application/pdf' : isPngFile ? 'image/png' : 'image/jpeg';

    if (await ExpoSharing.isAvailableAsync()) {
      await ExpoSharing.shareAsync(fileIntentUri, {
        mimeType,
        dialogTitle: title || (isPdfFile ? 'Share Document' : 'Share Image'),
        UTI: isPdfFile ? 'com.adobe.pdf' : isPngFile ? 'public.png' : 'public.jpeg',
      });
      return;
    }

    // Fallback: open URL in external browser/viewer
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      await Linking.openURL(uri);
      return;
    }

    Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('dismiss') || msg.includes('cancel') || msg.includes('User did not share')) {
      return;
    }
    console.warn('[shareImageUri] Error:', err);

    // Fallback to open URL directly in browser if sharing failed
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      try {
        await Linking.openURL(uri);
        return;
      } catch (linkErr) {
        console.warn('[shareImageUri] Fallback Linking.openURL failed:', linkErr);
      }
    }

    Alert.alert('Share Failed', 'Unable to share this file. Please try again.');
  }
}
