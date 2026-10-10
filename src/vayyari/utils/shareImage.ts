import { Alert, Platform, Linking, Share } from 'react-native';
import * as ExpoSharing from 'expo-sharing';
import { cacheDirectory, createDownloadResumable } from 'expo-file-system/legacy';

/**
 * Shares an image or PDF (local file or remote URL) with other apps via Android/iOS share intent.
 * Handles Expo Go, development builds, and standalone release APKs seamlessly.
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
    const isRemote = uri.startsWith('http://') || uri.startsWith('https://');

    // Remote HTTP/HTTPS file: download to local cache directory first
    if (isRemote) {
      const lower = uri.toLowerCase();
      const isPdf = lower.includes('.pdf');
      const isPng = lower.includes('.png');
      const ext = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';
      const filename = `share_${Date.now()}.${ext}`;
      const targetPath = `${cacheDirectory || ''}${filename}`;

      try {
        const downloadResumable = createDownloadResumable(uri, targetPath);
        const res = await downloadResumable.downloadAsync();
        if (res?.uri) {
          localUri = res.uri;
        }
      } catch (dlErr) {
        console.warn('[shareImageUri] Cache download failed, will fallback to URL:', dlErr);
      }
    }

    // Prepare local file intent URI
    const fileIntentUri = localUri.startsWith('file://')
      ? localUri
      : `file://${localUri.replace(/^[^/]+:\/\//, '')}`;

    const isPdfFile = fileIntentUri.toLowerCase().endsWith('.pdf');
    const isPngFile = fileIntentUri.toLowerCase().endsWith('.png');
    const mimeType = isPdfFile ? 'application/pdf' : isPngFile ? 'image/png' : 'image/jpeg';

    // 1. Primary: Try ExpoSharing
    try {
      if (await ExpoSharing.isAvailableAsync()) {
        await ExpoSharing.shareAsync(fileIntentUri, {
          mimeType,
          dialogTitle: title || (isPdfFile ? 'Share Document' : 'Share Image'),
          UTI: isPdfFile ? 'com.adobe.pdf' : isPngFile ? 'public.png' : 'public.jpeg',
        });
        return;
      }
    } catch (expoShareErr: any) {
      const msg = String(expoShareErr?.message || '');
      if (msg.includes('dismiss') || msg.includes('cancel') || msg.includes('User did not share')) {
        return;
      }
      console.warn('[shareImageUri] ExpoSharing failed, falling back:', expoShareErr);
    }

    // 2. Secondary: Try react-native-share (standard in standalone APKs)
    try {
      const RNShare = require('react-native-share').default;
      if (RNShare?.open) {
        await RNShare.open({
          url: fileIntentUri,
          type: mimeType,
          title: title || 'Share Document',
          failOnCancel: false,
        });
        return;
      }
    } catch (rnShareErr: any) {
      const msg = String(rnShareErr?.message || '');
      if (msg.includes('dismiss') || msg.includes('cancel') || msg.includes('User did not share')) {
        return;
      }
      console.warn('[shareImageUri] react-native-share unavailable or failed:', rnShareErr);
    }

    // 3. Tertiary: React Native built-in Share.share (works natively on all OSs)
    if (isRemote) {
      try {
        const shareResult = await Share.share({
          url: uri,
          title: title || 'Shipping Label',
          message: `${title || 'Shipping Label'}: ${uri}`,
        });
        if (shareResult.action === Share.sharedAction) {
          return;
        }
      } catch (rnShareNativeErr) {
        console.warn('[shareImageUri] Share.share failed:', rnShareNativeErr);
      }
    }

    // 4. Quaternary: Open in browser / system PDF viewer
    if (isRemote) {
      try {
        await Linking.openURL(uri);
        return;
      } catch (linkErr) {
        console.warn('[shareImageUri] Linking.openURL failed:', linkErr);
      }
    }

    Alert.alert('Sharing Unavailable', 'Unable to open or share this file on this device.');
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('dismiss') || msg.includes('cancel') || msg.includes('User did not share')) {
      return;
    }
    console.warn('[shareImageUri] Unhandled error:', err);
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      try {
        await Linking.openURL(uri);
        return;
      } catch {
        // Fallback suppressed
      }
    }
    Alert.alert('Share Failed', 'Unable to share this file. Please try again.');
  }
}
