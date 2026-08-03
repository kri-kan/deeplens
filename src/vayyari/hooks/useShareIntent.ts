import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useShareIntentContext, SharedMediaItem } from '@/context/ShareIntentContext';

export function useShareIntent() {
  const { setSharedMedia } = useShareIntentContext();
  const router = useRouter();

  useEffect(() => {
    // Process initial launch URL if opened via deep link / share scheme
    Linking.getInitialURL().then(url => {
      if (url) {
        parseAndNavigate(url);
      }
    });

    // Process incoming URLs while app is open / warm start
    const subscription = Linking.addEventListener('url', event => {
      if (event.url) {
        parseAndNavigate(event.url);
      }
    });

    return () => subscription.remove();
  }, []);

  const parseAndNavigate = (urlStr: string) => {
    try {
      const parsed = Linking.parse(urlStr);
      if (parsed.path === 'share' || parsed.hostname === 'share' || parsed.path === 'new' || parsed.hostname === 'new') {
        const mediaParams = parsed.queryParams?.media;
        if (typeof mediaParams === 'string') {
          const uris = mediaParams.split(',').filter(Boolean);
          const items: SharedMediaItem[] = uris.map(uri => ({
            uri,
            type: 'image',
          }));
          setSharedMedia(items);
          router.push('/(tabs)/new');
        }
      }
    } catch (error) {
      console.error('Error parsing share intent URL:', error);
    }
  };
}
