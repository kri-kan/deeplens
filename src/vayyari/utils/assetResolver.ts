import { Image, Platform } from 'react-native';

/**
 * Custom asset transformer for Android OTA resilience.
 *
 * When React Native loads a JavaScript bundle from an external filesystem path
 * (such as an OTA update at `ota/active/bundle.js`), AssetSourceResolver detects
 * `isLoadedFromFileSystem() === true` and prefixes asset URIs with the bundle directory
 * (`file:///data/user/0/.../files/ota/active/raw/...`).
 *
 * Because font files (`.ttf`) and static images are precompiled directly into the APK
 * (`res/raw` and `res/drawable`), looking for them on the filesystem causes ExpoFontLoader
 * to fail, rendering all `@expo/vector-icons` blank (<Text />).
 *
 * By intercepting asset resolution via `setCustomSourceTransformer`, we map filesystem-loaded
 * bundle assets back to Android resource identifiers without the file:// scheme so that
 * Android loads them directly from the APK binary.
 */
export function initializeAssetResolver(): boolean {
  if (Platform.OS !== 'android') return false;

  try {
    const resolveAssetSource: any = Image.resolveAssetSource;
    if (resolveAssetSource && typeof resolveAssetSource.setCustomSourceTransformer === 'function') {
      resolveAssetSource.setCustomSourceTransformer((resolver: any) => {
        if (resolver?.isLoadedFromFileSystem && resolver.isLoadedFromFileSystem()) {
          if (resolver.asset) {
            return resolver.resourceIdentifierWithoutScale();
          }
        }
        return null;
      });
      console.log('[AssetResolver] Custom Android asset source transformer initialized for OTA resilience');
      return true;
    }
  } catch (err) {
    console.warn('[AssetResolver] Failed to set custom source transformer:', err);
  }
  return false;
}

// Auto-run on module import
initializeAssetResolver();
