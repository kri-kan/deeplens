import { Platform, Linking, Alert } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

/**
 * Opens a shipping label PDF reliably in the device's default browser or PDF reader.
 * Uses direct HTTP URL so Android/Chrome handles download & print preview natively.
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

    // Try opening via external browser directly (Chrome, Samsung Internet, Drive PDF)
    // Linking.openURL on a direct HTTP/HTTPS PDF URL prompts the system app chooser:
    // Chrome, Drive PDF Viewer, Samsung Print Service, etc.
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }

    // Fallback: in-app browser
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      toolbarColor: '#0F172A',
    });
  } catch (err: any) {
    console.warn('[openPdfViewer] Linking failed, trying openBrowserAsync:', err);
    try {
      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch {
      Alert.alert('Unable to Open PDF', 'Please check your internet connection or PDF viewer app.');
    }
  }
}
