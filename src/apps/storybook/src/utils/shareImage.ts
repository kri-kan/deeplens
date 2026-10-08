import { Alert, Platform } from 'react-native';

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
          return;
        }
      }
      window.open(uri, '_blank');
      return;
    }

    Alert.alert('Share', `Sharing image: ${title || uri}`);
  } catch (err) {
    console.warn('[shareImageUri] Error:', err);
  }
}
