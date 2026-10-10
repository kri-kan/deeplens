import { Platform, Linking, Alert } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { cacheDirectory, createDownloadResumable, getContentUriAsync } from 'expo-file-system/legacy';

/**
 * Opens a PDF in a genuine PDF Viewer (Drive PDF Viewer, Chrome, Adobe, or system viewer)
 * using an Android VIEW intent (Intent.ACTION_VIEW) rather than a share intent (ACTION_SEND).
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

    // 1. Download PDF to local cache so Android viewer apps can read it
    let localUri = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const filename = `label_${Date.now()}.pdf`;
      const targetPath = `${cacheDirectory || ''}${filename}`;
      const downloadResumable = createDownloadResumable(url, targetPath);
      const res = await downloadResumable.downloadAsync();
      if (res?.uri) {
        localUri = res.uri;
      }
    }

    const fileUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;

    // 2. On Android: Try opening via content:// URI using Android VIEW intent
    if (Platform.OS === 'android') {
      try {
        const contentUri = await getContentUriAsync(fileUri);
        // Using Linking.openURL on a content:// URI triggers Android's VIEW intent chooser!
        // This prompts: "Open with Drive PDF Viewer, Chrome, Adobe Acrobat, etc."
        const canOpen = await Linking.canOpenURL(contentUri);
        if (canOpen) {
          await Linking.openURL(contentUri);
          return;
        }
      } catch (contentErr) {
        console.warn('[openPdfViewer] Content URI VIEW intent failed, trying browser:', contentErr);
      }
    }

    // 3. Fallback: Google Docs Online PDF Viewer inside in-app browser
    // This renders thermal PDF labels with zero external dependencies
    const gdocsViewerUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
    try {
      await openBrowserAsync(gdocsViewerUrl, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        toolbarColor: '#0F172A',
      });
      return;
    } catch (browserErr) {
      console.warn('[openPdfViewer] openBrowserAsync failed, trying direct Linking.openURL:', browserErr);
    }

    // 4. Fallback: Open original URL in external browser
    await Linking.openURL(url);
  } catch (err: any) {
    console.warn('[openPdfViewer] Error:', err);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to Open PDF', 'Could not open the shipping label. Please check your browser or PDF viewer app.');
    }
  }
}
