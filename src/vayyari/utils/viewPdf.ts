import { Platform, Alert } from 'react-native';
import { shareImageUri } from './shareImage';

/**
 * Opens a shipping label PDF reliably on the device.
 * On web: opens in a new browser tab.
 * On mobile (Android / iOS): uses shareImageUri which safely caches the PDF
 * and grants read URI permissions to system viewers and print services.
 */
export async function openPdfViewer(url?: string | null, title?: string): Promise<void> {
  if (!url) {
    Alert.alert('No Document', 'No PDF label available to view.');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    // On mobile devices, shareImageUri handles download, caching,
    // FileProvider URI resolution, and FLAG_GRANT_READ_URI_PERMISSION seamlessly.
    await shareImageUri(url, title || 'Delhivery Shipping Label');
  } catch (err: any) {
    console.warn('[openPdfViewer] Failed to open PDF viewer:', err);
    Alert.alert('Unable to Open PDF', 'Please check your connection or PDF viewer app.');
  }
}

