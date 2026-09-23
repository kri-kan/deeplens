import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Asset Resolver OTA Resilience Tests', () => {
  test('Asset transformer maps filesystem bundle assets to Android resource identifiers', () => {
    // Mock AssetSourceResolver instance
    const createMockResolver = (isFileSystem: boolean, assetName: string, assetType: string) => ({
      isLoadedFromFileSystem: () => isFileSystem,
      asset: {
        name: assetName,
        type: assetType,
        httpServerLocation: '/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts',
      },
      resourceIdentifierWithoutScale: function () {
        const cleanName = (this.asset.httpServerLocation + '/' + this.asset.name)
          .toLowerCase()
          .replace(/\//g, '_')
          .replace(/([^a-z0-9_])/g, '')
          .replace(/^(?:assets|assetsunstable_path)_/, '');
        return {
          __packager_asset: true,
          uri: cleanName,
        };
      },
    });

    // Transformer implementation under test
    const transformAsset = (resolver: any) => {
      if (resolver?.isLoadedFromFileSystem && resolver.isLoadedFromFileSystem()) {
        if (resolver.asset) {
          return resolver.resourceIdentifierWithoutScale();
        }
      }
      return null;
    };

    // 1. Filesystem-loaded bundle (OTA update)
    const otaResolver = createMockResolver(true, 'Ionicons', 'ttf');
    const otaResult = transformAsset(otaResolver);
    assert.ok(otaResult, 'Must return transformed asset for OTA filesystem bundles');
    assert.equal(
      otaResult.uri,
      '_node_modules_expo_vectoricons_build_vendor_reactnativevectoricons_fonts_ionicons'
    );
    assert.ok(!otaResult.uri.includes('file://'), 'Must not contain file:// protocol');
    assert.ok(!otaResult.uri.includes('.ttf'), 'Must not contain file extension for Android raw resources');

    // 2. Embedded APK bundle (non-filesystem)
    const embeddedResolver = createMockResolver(false, 'Ionicons', 'ttf');
    const embeddedResult = transformAsset(embeddedResolver);
    assert.equal(embeddedResult, null, 'Must return null for embedded APK bundles to allow default resolution');
  });

  test('Sanitization produces valid Android resource identifier format', () => {
    const sanitizeResourceIdentifier = (httpServerLocation: string, name: string) => {
      return (httpServerLocation + '/' + name)
        .toLowerCase()
        .replace(/\//g, '_')
        .replace(/([^a-z0-9_])/g, '')
        .replace(/^(?:assets|assetsunstable_path)_/, '');
    };

    const id = sanitizeResourceIdentifier(
      '/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts',
      'MaterialCommunityIcons'
    );
    assert.match(id, /^[a-z0-9_]+$/, 'Resource identifier must only contain lowercase alphanumeric and underscores');
    assert.ok(id.includes('materialcommunityicons'));
  });
});
