import { Alert, Platform, Linking, Share } from 'react-native';
import * as ExpoSharing from 'expo-sharing';
import {
  cacheDirectory,
  createDownloadResumable,
  copyAsync,
  deleteAsync,
  getInfoAsync,
} from 'expo-file-system/legacy';

/**
 * Shares an image or PDF (local file or remote URL) with other apps via Android/iOS share intent.
 * Handles Expo Go, development builds, and standalone release APKs seamlessly.
 *
 * @param uri Local file URI or remote HTTP/HTTPS URL
 * @param title Dialog / intent title
 * @param customFilename Optional custom name for the shared file (e.g. "Hyd-Apt Priya Sharma")
 */
export async function shareImageUri(
  uri?: string | null,
  title?: string,
  customFilename?: string
): Promise<void> {
  if (!uri) {
    Alert.alert('No File', 'No file available to share.');
    return;
  }

  try {
    const isRemote = uri.startsWith('http://') || uri.startsWith('https://');
    const lower = uri.toLowerCase();
    const isPdf =
      lower.includes('.pdf') ||
      Boolean(customFilename && customFilename.toLowerCase().endsWith('.pdf'));
    const isPng = lower.includes('.png');
    const ext = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';

    // Build clean target filename
    let targetFileName = `share_${Date.now()}.${ext}`;
    if (customFilename && customFilename.trim()) {
      const sanitized = customFilename
        .replace(/\.(pdf|png|jpg|jpeg)$/i, '')
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (sanitized) {
        targetFileName = `${sanitized}.${ext}`;
      }
    }

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
      try {
        const link = document.createElement('a');
        link.href = uri;
        link.download = targetFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch {
        window.open(uri, '_blank');
        return;
      }
    }

    let localUri = uri;
    const targetPath = `${cacheDirectory || ''}${targetFileName}`;

    // Clean up existing file if present to guarantee clean write
    try {
      const existing = await getInfoAsync(targetPath);
      if (existing?.exists) {
        await deleteAsync(targetPath, { idempotent: true });
      }
    } catch {
      // Non-critical if check fails
    }

    // Remote HTTP/HTTPS file: download to local cache directory first
    if (isRemote) {
      try {
        const downloadResumable = createDownloadResumable(uri, targetPath);
        const res = await downloadResumable.downloadAsync();
        if (res?.status && res.status >= 400) {
          try {
            await deleteAsync(targetPath, { idempotent: true });
          } catch {}
          Alert.alert('File Not Found', 'The requested file could not be found or downloaded from storage.');
          return;
        }
        if (res?.uri) {
          localUri = res.uri;
        }
      } catch (dlErr) {
        console.warn('[shareImageUri] Cache download failed, will fallback to URL:', dlErr);
      }
    } else {
      // Local file: copy to targetPath so the file carries the desired custom filename
      try {
        const sourcePath = localUri.startsWith('file://')
          ? localUri
          : `file://${localUri.replace(/^[^/]+:\/\//, '')}`;
        if (sourcePath !== targetPath) {
          await copyAsync({ from: sourcePath, to: targetPath });
          localUri = targetPath;
        }
      } catch (copyErr) {
        console.warn('[shareImageUri] Local copy with custom filename failed:', copyErr);
      }
    }

    // Validate downloaded file existence and non-zero size before sharing
    try {
      const fileInfo = await getInfoAsync(localUri);
      if (!fileInfo?.exists || (fileInfo as any).size === 0) {
        Alert.alert('Invalid File', 'The file is empty or could not be retrieved.');
        return;
      }
    } catch {
      // Non-critical check
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
          filename: targetFileName.replace(/\.[^/.]+$/, ''),
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
