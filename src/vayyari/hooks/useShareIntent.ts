import { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useShareIntentContext, SharedMediaItem } from '@/context/ShareIntentContext';
import { mediaStagingService } from '@/services/media-staging.service';

export function useShareIntent() {
  const { setSharedMedia, discardCurrentSession } = useShareIntentContext();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMedia, setModalMedia] = useState<SharedMediaItem[]>([]);
  const [modalSessionId, setModalSessionId] = useState<string | undefined>(undefined);

  const urlStr = Linking.useURL();

  useEffect(() => {
    // Perform opportunistic cleanup of stale staging folders
    mediaStagingService.cleanupOldStaging().catch(console.warn);
  }, []);

  useEffect(() => {
    if (urlStr) {
      parseShareIntentUrl(urlStr);
    }
  }, [urlStr]);

  // Also listen for incoming linking events while app is open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        parseShareIntentUrl(event.url);
      }
    });
    return () => subscription.remove();
  }, []);

  const parseShareIntentUrl = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      const isShareTarget = parsed.path === 'share-target' || 
                            parsed.hostname === 'share-target' || 
                            parsed.path === 'share-chooser' || 
                            parsed.hostname === 'share-chooser';
      
      const isLegacyShare = parsed.path === 'share' || 
                            parsed.hostname === 'share' || 
                            parsed.path === 'new' || 
                            parsed.hostname === 'new';

      if (isShareTarget || isLegacyShare) {
        const urisParam = (parsed.queryParams?.uris || parsed.queryParams?.media) as string | undefined;
        const sessionIdParam = parsed.queryParams?.sessionId as string | undefined;
        const actionParam = parsed.queryParams?.action as string | undefined;

        if (typeof urisParam === 'string' && urisParam.length > 0) {
          const uris = urisParam.split(',').filter(Boolean);
          const items: SharedMediaItem[] = uris.map(uri => {
            const lower = uri.toLowerCase();
            const isVideo = lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.mkv') || lower.endsWith('.webm');
            return {
              uri,
              type: isVideo ? 'video' : 'image',
              sessionId: sessionIdParam,
            };
          });

          if (actionParam === 'order' || actionParam === 'product') {
            setSharedMedia(items, sessionIdParam);
            setModalVisible(false);
            setModalMedia([]);
            setModalSessionId(undefined);
          } else {
            // action === 'chooser' or no action
            setModalMedia(items);
            setModalSessionId(sessionIdParam);
            setModalVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing share intent URL:', error);
    }
  };

  const handleCreateOrder = () => {
    setModalVisible(false);
    setSharedMedia(modalMedia, modalSessionId);
    setModalMedia([]);
    setModalSessionId(undefined);
    router.push('/(tabs)/new');
  };

  const handleCreateProduct = () => {
    setModalVisible(false);
    setSharedMedia(modalMedia, modalSessionId);
    setModalMedia([]);
    setModalSessionId(undefined);
    router.push('/utilities/create-product');
  };

  const handleDiscard = async () => {
    if (modalSessionId) {
      await mediaStagingService.purgeSession(modalSessionId);
    }
    setModalVisible(false);
    setModalMedia([]);
    setModalSessionId(undefined);
  };

  return {
    modalVisible,
    modalMedia,
    modalSessionId,
    handleCreateOrder,
    handleCreateProduct,
    handleDiscard,
  };
}
