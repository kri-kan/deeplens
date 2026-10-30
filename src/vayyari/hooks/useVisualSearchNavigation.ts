import { useCallback } from 'react';
import { useRouter } from 'expo-router';

export interface VisualSearchNavigationOptions {
  imageUri?: string | null;
  storagePath?: string | null;
  mediaId?: string | null;
  postId?: string | null;
  onBeforeNavigate?: () => void;
}

export function useVisualSearchNavigation() {
  const router = useRouter();

  const openVisualSearch = useCallback(
    ({
      imageUri,
      storagePath,
      mediaId,
      postId,
      onBeforeNavigate,
    }: VisualSearchNavigationOptions) => {
      if (!imageUri && !storagePath && !mediaId && !postId) return;

      onBeforeNavigate?.();

      let resolvedStoragePath = storagePath;
      if (!resolvedStoragePath && imageUri && imageUri.includes('path=')) {
        try {
          const match = imageUri.match(/[?&]path=([^&]+)/);
          if (match && match[1]) {
            resolvedStoragePath = decodeURIComponent(match[1]);
          }
        } catch {}
      }

      router.push({
        pathname: '/utilities/product-list',
        params: {
          visualImageUri: imageUri || '',
          visualStoragePath: resolvedStoragePath || '',
          visualMediaId: mediaId || '',
          visualPostId: postId || '',
        },
      });
    },
    [router]
  );

  return { openVisualSearch };
}
